const puppeteer = require('puppeteer');
const mongodb = require('mongodb').MongoClient;
const MongoDBConfig = require('./MongoDBConfig');
const Util = require("./Common");
const RecordConfig = require('./RecordConfig');

(async () => {
	const browser = await puppeteer.launch({
		headless:false,
	});

	//"C:\Program Files\Google\Chrome\Application\chrome.exe"
	//--remote-debugging-port=9222 --headless --remote-debugging-address=0.0.0.0
	//防火墙务必要关闭
	//http://192.168.x.x:9222/json/version

	/*const browser = await (puppeteer.connect({
		browserWSEndpoint: 'ws://192.168.x.x:9222/devtools/browser/34b9f6d4-2ed0-4c82-aac0-fca32c995cfe'
	}));*/

	const pages = await browser.pages();
	var page;
	if (pages.length > 0) {
		page = pages[0];
	} else {
		page = browser.newPage();
	}

	await page.on('dialog', async dialog => {
		console.log('dialog：', dialog.message(), dialog.type());
		setTimeout(() => {
			dialog.dismiss();
		}, 3000);
	});

	let interfaceData = [];
	await Util.pageOnResponse(page,RecordConfig,interfaceData,true);

	await Util.pageStartJSCSSCoverage(page);

	await page.goto(RecordConfig.url);
	await page.waitFor(3000);

	await Util.sleep(RecordConfig.operation_time*1000);
	//await page.waitFor(3000);

	let coverageData = await Util.pageStopJSCSSCoverage(page,RecordConfig,true);
	//console.log(coverageData);

	Util.mongodbInsertMany(mongodb,MongoDBConfig,MongoDBConfig.interface_collection,interfaceData);
	Util.mongodbInsertMany(mongodb,MongoDBConfig,MongoDBConfig.coverage_collection,coverageData);

	await Util.sleep(3000);
	await page.waitFor(3000);
	await page.close();
	await browser.close();
})();