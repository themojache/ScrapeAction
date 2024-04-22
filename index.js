const jsdom = require("jsdom");
const axios = require("axios");
const fs = require("fs");

let archiveFile = require("./codes.json"); //{"valid":{},"invalid":{},"archive":{}}

function lessThanAWeek(date) {
  return date > Date.now() - (1000 * 60 * 60 * 24 * 7);
}
function documentTypeParse(response) {
    let document = null;
    try {
        document = JSON.parse(response);
    } catch (e) {
        /*if(response instanceof HTMLDocument || response instanceof Document) {
            document = response;
        } else*/ if(typeof response === "object" && response !== null && !Array.isArray(response) && response.responseText) {
            document = stringToDoc(response.responseText);
        } else if (response instanceof String || typeof response === "string" || Object.prototype.toString.call(response) === "[object String]") {
            document = stringToDoc(response);
        } else {
            console.log("Unsupported type:", typeof response);
        }
    }
    return document;
}
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => {
  // No-op to skip console errors.
});
function stringToDoc(str) {
    if(jsdom) {
        const dom = new jsdom.JSDOM(str, { virtualConsole });
        return dom.window.document;
    } else if(DOMParser) {
        const parser = new DOMParser(); //https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
        return parser.parseFromString(str, "text/html");
    }
}


function fromGiftURL(url) {
    var parse = new URL(url);
    const params = new URLSearchParams(parse.search);
    return params.has("code") ? params.get("code") : "";
}
function AllExcept(els, except) {
    return Array.isArray(except) ? [...els].filter(el => !except.includes(el)) : [...els].filter(el => el != except);
}
function parseStdUL(uls) {
    return [...new Set([...uls].map(el => textOf(el.querySelectorAll("li strong:first-child")).filter(no => !exceptions.includes(no))).flat(Infinity))];
}
function textOf(list) {
    return [...new Set([...list].map(no => (no.innerText ?? no.textContent ?? "").trim()))];
}
function fromAElements(list) {
    return [...new Set([...list].map(el => fromGiftURL(el.href)))];
}
function fromLinksWithCodes(list) {
    return [...new Set([...fromAElements(list), ...textOf(list)])];
}



function genshinData(response) {
	return [...(response.data.posts ?? response.data.list).reduce((acc, post) => {
		var date = new Date(post.post.created_at * 1000);
		if(lessThanAWeek(date)) {
			var body = [post.post.subject, post.post.content].join("\n");
			for(var code of [...body.matchAll(validCode)].map(el => el[1].trim())) {
				acc.add(code);
			}
		}
		return acc;
	}, new Set())];
}


var map = {
	"https://bbs-api-os.hoyolab.com/community/search/wapi/search/post?author_type=0&game_id=2&is_all_game=false&keyword=primos&order_type=0&page_num=1&page_size=50&preview=true&recommend_word=code&scene=SCENE_GENERAL": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=33651": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=33651": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=15593": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=112964": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=857": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=203049": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=3070": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/topic/post/new?loading_type=0&page_size=100&reload_times=0&tab_id=2&topic_id=918": genshinData,
    "https://bbs-api-os.hoyolab.com/community/search/wapi/search/post?author_type=0&game_id=2&is_all_game=false&keyword=primos&order_type=0&page_num=1&page_size=50&preview=true&recommend_word=code&scene=SCENE_GENERAL": genshinData,
    "https://bbs-api-os.hoyolab.com/community/painter/wapi/search?game_id=2&keyword=Redeem%20Code": genshinData,
    "https://genshin-impact.fandom.com/wiki/Promotional_Code": (response) => {
        let document = documentTypeParse(response);
        var target = document.querySelector("#All_Codes").parentElement.nextElementSibling.nextElementSibling;
        if(target.nodeName == "TABLE") {
            var parse = /((?:\d{4}\-\d{2}\-\d{2})|indefinite|expired)/igm;
			var now = new Date(); //.toLocaleString("en-US",{ timeZone: "America/Los_Angeles"});
            return [...[...target.querySelectorAll("tbody tr td[data-sort-val]")].reduce((acc, cell) => {
                var status = [...cell.getAttribute("data-sort-val").matchAll(parse)].map(date => date[0].toLowerCase());
                if(status.includes("expired")) {
                } else if(status.includes("indefinite")) {
					for(var code of [...textOf(cell.parentElement.firstElementChild.querySelectorAll("code")), ...fromAElements(cell.parentElement.querySelectorAll("a[href^='https://genshin.hoyoverse.com/en/gift?code=']"))]) {
						acc.add(code);
					}
                } else {
                    var dateParsed = status.map(date => new Date(date)).sort((a,b) => b - a);
                    if(+dateParsed[0] > +now && +now > +dateParsed[1]) {
						for(var code of [...textOf(cell.parentElement.firstElementChild.querySelectorAll("code")), ...fromAElements(cell.parentElement.querySelectorAll("a[href^='https://genshin.hoyoverse.com/en/gift?code=']"))]) {
							acc.add(code);
						}
                    }
                }
				return acc;
            }, new Set())];
        }
    },
    "https://www.pockettactics.com/genshin-impact/codes": (response) => {
        let document = documentTypeParse(response);
        var active = [...document.querySelectorAll("a[data-target='Active-codes'], a[href='#Active-codes']")];
        var uls = active.map(el => el.parentElement.parentElement.parentElement.parentElement.nextElementSibling.nextElementSibling).filter(el => el.nodeName == "UL");
        return parseStdUL(uls);
    },
    "https://scoofszlo.github.io/genshinimpact_codetracker/": (response) => {
        let document = documentTypeParse(response);
        return fromLinksWithCodes(document.querySelector("div.list_of_codes div.card_container").querySelectorAll(".reward_code a"));
    },
    "https://www.pcgamesn.com/genshin-impact/codes-redeem-promo": (response) => {
        let document = documentTypeParse(response);
        return parseStdUL(AllExcept(document.querySelectorAll(".entry-content ul"), document.querySelector("h3 ~ ul")));
    },
    "https://progameguides.com/genshin-impact/genshin-impact-codes/": (response) => {
        let document = documentTypeParse(response);
        return parseStdUL(["h2#genshin-impact-livestream-codes ~ ul", "h3#active-genshin-impact-codes-working ~ ul"].map(el => document.querySelector(el))).filter(el => el.toLowerCase() != "there are currently no active genshin impact livestream codes.");
    },
    "https://www.gamesradar.com/genshin-impact-codes-redeem/": (response) => {
        let document = documentTypeParse(response);
        return parseStdUL(AllExcept(document.querySelectorAll("#article-body ul"), document.querySelector("h2#expired-genshin-impact-redemption-codes-xa0 ~ ul")));
    },
    "https://www.rockpapershotgun.com/genshin-impact-codes-list": (response) => {
        let document = documentTypeParse(response);
        return parseStdUL(["h2#section-1 ~ ul", "h2#section-6 ~ ul"].map(el => document.querySelector(el)));
    },
    "https://www.vg247.com/genshin-impact-codes": (response) => {
        let document = documentTypeParse(response);
        return parseStdUL(["h2#codes ~ ul", "h2#livestream-codes ~ ul"].map(el => document.querySelector(el)));
    },
    "https://www.pocketgamer.com/genshin-impact/codes/": (response) => {
        let document = documentTypeParse(response);
        return parseStdUL(document.querySelectorAll(".body-copy ul:first-of-type"));
    },
    "https://www.ggrecon.com/guides/genshin-impact-codes/": (response) => {
        let document = documentTypeParse(response);
        return textOf(document.querySelectorAll("table tbody tr:not(:first-of-type) strong:first-child"));
    },
    "https://www.supereasy.com/genshin-impact-promo-codes/": (response) => {
        let document = documentTypeParse(response);
        var uls = [document.querySelector("#h-available-codes ~ ul")];
        var lastNode = uls[uls.length - 1];
        while(lastNode.nextElementSibling.nodeName == "UL") {
            uls.push(lastNode = lastNode.nextElementSibling);
        }
        return parseStdUL(uls);
    },
    "https://ucngame.com/codes/genshin-impact-codes/": (response) => {
        let document = documentTypeParse(response); //formatting inconsistent, strong tags are inside and outside of a tags. Luckily the a tag seems to contain "just the code"'s text'.
        return fromLinksWithCodes(document.querySelectorAll("h3#new-valid-redeem-codes-for-genshin-impact ~ figure table tr td a[href]"));
    },
    "https://game8.co/games/Genshin-Impact/archives/304759": (response) => {
        let document = documentTypeParse(response);
        var selector = "h2#hl_1 + h3#hm_1 ~ ol a[href^='https://genshin.hoyoverse.com/en/gift?code='], h2#hl_2 + h3#hm_2 ~ ol a[href^='https://genshin.hoyoverse.com/en/gift?code=']";
        return fromLinksWithCodes(document.querySelectorAll(selector));
    },
    "https://gamewith.net/genshin-impact/article/show/22737": (response) => {
        let document = documentTypeParse(response);
        var table = document.querySelector("a.gdb-btn--green[href='https://genshin.mihoyo.com/en/gift'] ~ div.genshin_table_table table");
        return fromAElements(table.querySelectorAll("tr td a[href^='https://genshin.hoyoverse.com/en/gift?code=']"));
    }
};
var validCode = /(?:^|[\s\b\W])([A-Z0-9]{10,25})(?:[\s\b\W]|$)/igm; //longest known is 21, giving a bit of a buffer.
var testCode = /^([A-Z0-9]{10,25})$/i;
var testCode2 = /^.*([A-Z].*\d|\d.*[A-Z]).*$/i;
var exceptions = ["–","-",""," ",":"];
var sites = Object.keys(map);
Promise.all(sites.map(el => axios.get(el))).then(res => {
	var codes = new Set();
	archiveFile = {
		valid: new Map(Object.entries(archiveFile.valid)),
		invalid: new Map(Object.entries(archiveFile.invalid)),
		archive: new Map(Object.entries(archiveFile.archive))
	};
	for(var [current,v] of archiveFile.valid) {
		if(!lessThanAWeek(new Date(archiveFile.valid.get(current).date))) {
			archiveFile.archive.set(current, archiveFile.valid.get(current));
			archiveFile.valid.remove(current);
		}			
	}
	for(var [current,v] of archiveFile.invalid) {
		if(!lessThanAWeek(new Date(archiveFile.invalid.get(current).date))) { //Bye!
			//archiveFile.archive.set(current, archiveFile.invalid.get(current));
			archiveFile.invalid.remove(current);
		}			
	}
	for(var [k,v] of archiveFile.valid) {
		codes.add(k.toLowerCase());
	}
	for(var [k,v] of archiveFile.invalid) {
		codes.add(k.toLowerCase());
	}
	for(var [k,v] of archiveFile.archive) {
		codes.add(k.toLowerCase());
	}
	
	var decode = res.reduce((acc, resp) => {
		var dt = new Date();
		var host = new URL(resp.config.url).hostname;
		for(var code of map[resp.config.url](resp.data)) {
			for(var segment of code.trim().split(/[\s\-–\/,:]/).filter(el => el.length > 0 && !codes.has(el.toLowerCase()))) {
				var isForums = host == "bbs-api-os.hoyolab.com";
				var addTo = testCode.test(segment) && ((isForums && testCode2.test(segment)) || !isForums);
				var target = (addTo ? acc.valid : acc.invalid);
				if(!codes.has(segment.toLowerCase()) && !target.has(segment)) {
					codes.add(segment.toLowerCase());
					target.set(segment, {
						date: +dt,
						site: host
					});
				}
			}
		}
		return acc;
	}, archiveFile);
	fs.writeFile("codes.json", JSON.stringify({
		valid: Object.fromEntries(decode.valid),
		invalid: Object.fromEntries(decode.invalid),
		archive: Object.fromEntries(decode.archive)
	}), (err) => {
		if(err) {
			throw err;
		}
		//console.log("Saved");
	});
	fs.writeFile("valid.json", JSON.stringify(Object.keys(Object.fromEntries(decode.valid))), (err) => {
		if(err) {
			throw err;
		}
		//console.log("Saved");
	});
});