const puppeteer = require('puppeteer');
const url = require('url');
//const RecordConfig = require('./RecordConfig');
//const PlaybackConfig = require('./PlaybackConfig');
const chalk = require('chalk');
const Table = require('cli-table');
const pti = require('puppeteer-to-istanbul');

class Util {
	/**
	 * 异步延迟
	 * @param {number} time 延迟的时间,单位毫秒
	 */
	static sleep(time = 0) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve();
			}, time);
		})
	}

	/**
	 * 向mongodb批量插入数据
	 * @param {object} mongodb mongodb对象
	 * @param {object} MongoDBConfig mongodb对象配置文件，见MongoDBConfig.js
	 * @param {string} collection 插入数据的collection
	 * @param {Array} data 插入数据（数组）
	 */
	static async mongodbInsertMany(mongodb,MongoDBConfig,collection,data){
		if(data && data.length>0){
			mongodb.connect(MongoDBConfig.url, {
				useNewUrlParser: true
			},async function (err, db) {
				if (err) throw err;
				const puppeteerdb = db.db(MongoDBConfig.db);
				let insert_collection = puppeteerdb.collection(collection);
				await insert_collection.insertMany(data,async function (err, res) {
					if (err) throw err;
					console.log("insert " + data.length+ "条数据成功");
					await db.close();
				});
			});
		}
	}

	/**
	 * 根据tag和innertext查找元素
	 * @param {object} page page对象
	 * @param {string} tag 标签
	 * @param {string} innertext 文本
	 * @output {object} 找到返回elment，找不到返回null
	 */
	static async getElementByInnerText(page, tag, innertext) {
		const elements = await page.$$(tag);
		for (let elment of elements) {
			let valueHandle = await elment.getProperty('innerText');
			let text = await valueHandle.jsonValue();
			if (text == innertext) {
				return elment;
			}
		}
		return null;
	}

	/**
	 * 给page绑定想听请求响应事件，自动记录到interfaceData
	 * @param {object} page page对象
	 * @param {object} RecordConfig 录制配置，见RecordConfig.js
	 * @param {Array} interfaceData 接口数组
	 * @param {Boolean} consoleLog 是否输出日志，true输出，false不输出
	 */
	static async pageOnResponse(page,RecordConfig,interfaceData,consoleLog){
		if(!consoleLog){consoleLog = false;}
		await page.on('response', async response => {
			if (response.url().endsWith('.png') || response.url().endsWith('.jpg') || response.url().endsWith('.gif') || response.url().endsWith('.ico') || response.url().indexOf('.js') != -1 || response.url().indexOf('.css') != -1 || response.url().length > 2048) {} else {
				let request = response.request();
				response.text().then(function (text) {
					let jsonheader = response.headers();
					let contenttype = jsonheader['content-type'];
					if (contenttype && contenttype.indexOf('application/json') != -1) {
						if(consoleLog){
							console.log('【请求url】REQUEST:', request.url());
							console.log('【请求header】REQUEST:', request.headers());
							console.log('【请求body】REQUEST:', request.postData());
							console.log('【请求method】REQUEST:', request.method());
							console.log('【响应status】RESPONSE:', response.status());
							console.log('【响应headers】RESPONSE:', response.headers());
							console.log('【响应content-type】RESPONSE:', contenttype);
						}
						let textjson = JSON.parse(text);
						if(consoleLog){
							console.log('【响应body】RESPONSE:', text);
							console.log('【返回json】RESPONSE:', textjson['success']);
							console.log('\n');
						}
						/*let insertSql = 'INSERT INTO interface(requestUrl,requestHeader,requestBody,requestMethod,responseStatus,responseHeader,responseContentType,responseBody,responseJsonSuccess,time) VALUES(?,?,?,?,?,?,?,?,?,?)';
						let insertSqlParams = [request.url(), JSON.stringify(request.headers()), request.postData(), request.method(), response.status(), JSON.stringify(response.headers()), contenttype, JSON.stringify(textjson), String(textjson['success']), new Date()];
						//console.log(insertSqlParams);
						connection.query(insertSql, insertSqlParams, function (err, result) {
							if (err) {
								console.log('[INSERT ERROR] - ', err.message);
								return;
							}
							console.log('--------------------------INSERT----------------------------');
							console.log('INSERT ID:', result);
							console.log('-----------------------------------------------------------------\n\n');
						});*/
						interfaceData.push({
							testcaseId:RecordConfig.testcase_id,
							testcaseName:RecordConfig.testcase_name,
							requestUrl:request.url(),
							requestHeader:request.headers(),
							requestBody:request.postData(),
							requestMethod:request.method(),
							responseStatus:response.status(),
							responseHeader:response.headers(),
							responseContentType:contenttype,
							responseBody:textjson,
							responseJsonSuccess:textjson['success'],
							time:new Date()
						});
					} else if (contenttype && contenttype.indexOf('text/html') != -1) {
						if(consoleLog){
							console.log('【响应content-type】RESPONSE:',contenttype);
						}
					} else  if (contenttype) {
						if(consoleLog){
							console.log('【响应content-type】RESPONSE:',contenttype);
						}
					}else {
						/*if(consoleLog){
							console.log('【响应content-type】RESPONSE:',"undefined");
						}*/
						//console.log('\n');
					}
				}).catch(function onRejected(error) {
					let jsonheader = response.headers();
					let contenttype = jsonheader['content-type'];
					if(consoleLog){
						console.log('【请求url】REQUEST:', request.url());
						console.log('【请求header】REQUEST:', request.headers());
						console.log('【请求body】REQUEST:', request.postData());
						console.log('【请求method】REQUEST:', request.method());
						console.log('【响应status】RESPONSE:', response.status());
						console.log('【响应headers】RESPONSE:', response.headers());
						console.log('【响应content-type】RESPONSE:', contenttype);
						console.log('【响应body】RESPONSE:', error);
						console.log('\n');
					}
				});
			}
		});
	}

	/**
	 * 页面开启JS CSS覆盖率统计
	 * @param {object} page page对象
	 */
	static async pageStartJSCSSCoverage(page){
		await Promise.all([
			page.coverage.startJSCoverage(),
			page.coverage.startCSSCoverage()
		]);
	}

	static addUsage(stats, coverage, type, eventType) {
		for (const entry of coverage) {
			if (!stats.has(entry.url)) {
				stats.set(entry.url, []);
			}
			const urlStats = stats.get(entry.url);
			let eventStats = urlStats.find(item => item.eventType === eventType);
			if (!eventStats) {
				eventStats = {
					cssUsed: 0,
					jsUsed: 0,
					get usedBytes() {
						return this.cssUsed + this.jsUsed;
					},
					totalBytes: 0,
					get percentUsed() {
						return this.totalBytes ? Math.round(this.usedBytes / this.totalBytes * 100) : 0;
					},
					eventType,
					url: entry.url,
				};
				urlStats.push(eventStats);
			}
			eventStats.totalBytes += entry.text.length;
			for (const range of entry.ranges) {
				eventStats[`${type}Used`] += range.end - range.start - 1;
			}
		}
	}
	
	static printStats(stats) {
		for (const [url, vals] of stats) {
			console.log('\n' + chalk.cyan(url));
			const table = new Table({
				// chars: {mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
				head: [
					'Event',
					`${chalk.bgRedBright(' JS ')} ${chalk.bgBlueBright(' CSS ')} % used`,
					'JS used',
					'CSS used',
					'Total bytes used'
				],
				// style : {compact : true, 'padding-left' : 0}
				style: {
					head: ['white'],
					border: ['grey']
				}
				// colWidths: [20, 20]
			});
			const usageForEvent = vals.filter(val => val.eventType === 'networkidle0');
			if (usageForEvent.length) {
				for (const stats of usageForEvent) {
					// totalBytes += stats.totalBytes;
					// totalUsedBytes += stats.usedBytes;	  
					const formatter = new UsageFormatter(stats);
					table.push([
						UsageFormatter.eventLabel(stats.eventType),
						formatter.barGraph(),
						formatter.shortSummary(stats.jsUsed), // !== 0 ? `${Util.formatBytesToKB(stats.jsUsed)}KB` : 0,
						formatter.shortSummary(stats.cssUsed),
						formatter.summary()
					]);
				}
			} else {
				table.push([UsageFormatter.eventLabel('networkidle0'), 'no usage found', '-', '-', '-']);
			}
			console.log(table.toString());
		}
	}
	
	static formatBytesToKB(bytes) {
		if (bytes > 1024) {
			const formattedNum = new Intl.NumberFormat('en-US', {
				maximumFractionDigits: 1
			}).format(bytes / 1024);
			return `${formattedNum}KB`;
		}
		return `${bytes} bytes`;
	}

	/**
	 * 页面关闭JS CSS覆盖率统计
	 * @param {object} page page对象
	 * @param {object} RecordConfig RecordConfig配置，见RecordConfig.js
	 * @param {Boolean} consoleLog 是否开启日志输出，true输出，false不输出
	 * @output {Array} coverageData 覆盖率数组
	 */
	static async pageStopJSCSSCoverage(page,RecordConfig,consoleLog){
		const [jsCoverage, cssCoverage] = await Promise.all([
			page.coverage.stopJSCoverage(),
			page.coverage.stopCSSCoverage()
		]);
		pti.write(jsCoverage);
		//console.log(jsCoverage);
		const stats = new Map();
		Util.addUsage(stats, jsCoverage, 'js', 'networkidle0');
		Util.addUsage(stats, cssCoverage, 'css', 'networkidle0');
		if(consoleLog){
			Util.printStats(stats);
		}
		let coverageData = [];
		for (const [url, vals] of stats) {
			if (vals.length) {
				for (const val of vals) {
					const percentJs = Math.round((val.jsUsed / val.totalBytes) * 100);
					const percentCss = Math.round((val.cssUsed / val.totalBytes) * 100);
					const percent = Math.round((val.usedBytes / val.totalBytes) * 100);
					/*let insertSql = 'INSERT INTO coverage(url,event,jsUsed,cssUsed,totalBytesUsed,time) VALUES(?,?,?,?,?,?)';
					let insertSqlParams = [chalk.cyan(url), val.eventType, val.jsUsed ? `${Util.formatBytesToKB(val.jsUsed)} (${percentJs}%)` : '-', val.cssUsed ? `${Util.formatBytesToKB(val.cssUsed)} (${percentCss}%)` : '-', `${Util.formatBytesToKB(val.usedBytes)}/${Util.formatBytesToKB(val.totalBytes)} (${percent}%)`, new Date()];
					connection.query(insertSql, insertSqlParams, function (err, result) {
						if (err) {
							console.log('[INSERT ERROR] - ', err.message);
							return;
						}
						console.log('--------------------------INSERT----------------------------');
						console.log('INSERT ID:', result);
						console.log('-----------------------------------------------------------------\n\n');
					});*/
					coverageData.push({
						testcaseId:RecordConfig.testcase_id,
						testcaseName:RecordConfig.testcase_name,
						url:chalk.cyan(url),
						event:val.eventType,
						jsUsed:val.jsUsed ? `${Util.formatBytesToKB(val.jsUsed)} (${percentJs}%)` : '-',
						cssUsed:val.cssUsed ? `${Util.formatBytesToKB(val.cssUsed)} (${percentCss}%)` : '-',
						totalBytesUsed:`${Util.formatBytesToKB(val.usedBytes)}/${Util.formatBytesToKB(val.totalBytes)} (${percent}%)`,
						time:new Date()
					});
				}
			} else {
				/*let insertSql = 'INSERT INTO coverage(url,event,jsUsed,cssUsed,totalBytesUsed,time) VALUES(?,?,?,?,?,?,?)';
				let insertSqlParams = [chalk.cyan(url), '-', '-', '-', '-', new Date()];
				connection.query(insertSql, insertSqlParams, function (err, result) {
					if (err) {
						console.log('[INSERT ERROR] - ', err.message);
						return;
					}
					console.log('--------------------------INSERT----------------------------');
					console.log('INSERT ID:', result);
					console.log('-----------------------------------------------------------------\n\n');
				});*/
				coverageData.push({
					testcaseId:RecordConfig.testcase_id,
					testcaseName:RecordConfig.testcase_name,
					url:chalk.cyan(url),
					event:val.eventType,
					jsUsed:val.jsUsed ? `${Util.formatBytesToKB(val.jsUsed)} (${percentJs}%)` : '-',
					cssUsed:val.cssUsed ? `${Util.formatBytesToKB(val.cssUsed)} (${percentCss}%)` : '-',
					totalBytesUsed:`${Util.formatBytesToKB(val.usedBytes)}/${Util.formatBytesToKB(val.totalBytes)} (${percent}%)`,
					time:new Date()
				});
			}
		}
		return coverageData;
	}

	/**
	 * 获取远程webSocketDebuggerUrl
	 * @param {string} urlJson json地址
	 * @output {string} browserWSEndpoint 成功返回字符串，不成功则返回''
	 */
	static async getWebSocketDebuggerUrl(urlJson) {
		let webSocketDebuggerUrl = '';
		const browser = await puppeteer.launch({
			headless: true
		});
		const page = await browser.newPage();
		await page.on('response', response => {
			response.text().then(function (text) {
				//let textjson = JSON.parse(text.substring(1,text.length-3).trim());
				let textjson = JSON.parse(text);
				//console.log(typeof textjson);		
				//console.log('webSocketDebuggerUrl:',textjson['webSocketDebuggerUrl']);
				webSocketDebuggerUrl = textjson['webSocketDebuggerUrl'];
			}).catch(function onRejected(error) {
				//console.log(error);				
			});
		});
		await page.goto(urlJson);
		await page.waitFor(1000);
		await browser.close();
		return webSocketDebuggerUrl;
	}

	static requestEachUrl(request, req,count,reqs,PlaybackConfig,resps) {
		return new Promise((resolve, reject) => {
			/*var reg = /^http(s)?:\/\/(.*?)\//;
			req.requestUrl = req.requestUrl.replace(reg, PlaybackConfig.host+'/');
			let jsonsHeader = JSON.parse(req.requestHeader);
			for(var key in jsonsHeader){
				jsonsHeader[key] = jsonsHeader[key].replace(reg, PlaybackConfig.host+'/');
			}*/
			let urlParse = url.parse(req.requestUrl);
			urlParse.host = PlaybackConfig.host;
			urlParse.port = PlaybackConfig.port;
			urlParse.hostname = PlaybackConfig.host_name;
			req.requestUrl = url.format(urlParse);
			//let jsonsHeader = JSON.parse(req.requestHeader);
			let jsonsHeader = req.requestHeader;
			for(var key in jsonsHeader){
				if(key=='referer' || key == 'origin'){
					let headerUrlParse = url.parse(jsonsHeader[key]);
					headerUrlParse.host = PlaybackConfig.host;
					headerUrlParse.port = PlaybackConfig.port;
					headerUrlParse.hostname = PlaybackConfig.host_name;
					jsonsHeader[key] = url.format(headerUrlParse);
				}
			}
			//req.requestHeader = JSON.stringify(jsonsHeader);
			req.requestHeader = jsonsHeader;

			if(req.requestBody){
				if(count>=1 && PlaybackConfig.replace_key && PlaybackConfig.replace_key.length>0 && PlaybackConfig.replace_key_minlength &&  PlaybackConfig.replace_key_minlength){
					let list = [];
					let replace = false;
					Util.splitRequestBody(req.requestBody,list);
					if(list){
						for(let index in PlaybackConfig.replace_key){
							let key = PlaybackConfig.replace_key[index];
							if(list[key] && list[key].length>=PlaybackConfig.replace_key_minlength){
								for(let i = count-1;i>0;i--){
									//let jsons = JSON.parse(reqs[i].responseBody);
									let jsons = reqs[i].responseBody;
									let map = [];
									Util.getAllJson(jsons,'jsons',map);
									if(map && resps[i]){
										for(let k in map){
											//console.log(k);
											if(list[key]==map[k]){
												//console.log(resps[i]);
												//let jsonsAfter = JSON.parse(resps[i].responseBody);
												let jsonsAfter = resps[i].responseBody;
												let mapAfter = [];
												Util.getAllJson(jsonsAfter,'jsons',mapAfter);
												if(mapAfter){
													list[key] = mapAfter[k];
													req.requestBody = Util.combineRequestBody(list);
													replace = true;
												}
												break;
											}
										}
									}
									if(replace){
										break;
									}
								}
							}
						}
					}
				}
			}
			//JSON.parse(req.requestHeader)
			Util.sendRequest(request, req.requestUrl, req.requestMethod, req.requestHeader, req.requestBody, function (response) {
				if (!response.error) {
					//resps.push(response);
					let jsons = req.responseBody;
					let map = [];
					Util.getAllJson(jsons,'jsons',map);
					let jsonsAfter = response.data;
					let mapAfter = [];
					Util.getAllJson(jsonsAfter,'jsons',mapAfter);
					//let jsonsDiff = [];
					let jsonsDiff = new Map();
					Util.compareJsons(map,mapAfter,jsonsDiff);
					let result = true;
					//if(jsonsDiff.length){
					if(jsonsDiff.size>0){
						result = false;
					}		
					//console.log(typeof jsonsDiff);
					//console.log(jsonsDiff.length);	
					//var jsonObject = JSON.stringify(jsonsDiff);
					console.log(jsonsDiff);
					let resp = {
						testcaseId:req.testcaseId,
						testcaseName:req.testcaseName,
						requestUrl:req.requestUrl,
						//requestHeader:JSON.parse(req.requestHeader),
						requestHeader:req.requestHeader,
						requestBody:req.requestBody,
						requestMethod:req.requestMethod,
						responseStatus:response.statusCode,
						responseHeader:response.headers,
						responseContentType:'',
						responseBody:response.data,
						responseJsonSuccess:String(response.success),
						pass:String(result),
						diff:jsonsDiff,
						time: new Date()
					};
					resps.push(resp);
					resolve(req);
				} else {
					reject(response.error);
				}
			});
		});
	}

	static async foreachUrl(arr, callback) {
		/*for await (const r of arr){
			callback(r);
		}*/
		let i = 0;
		for (const r of arr) {
			await callback(r,i);
			i++;
		}
	}

	/**
	 * 批量执行接口测试
	 * @param {object} request request对象
	 * @param {Array}  reqs 录制的接口数据数组
	 * @param {object} PlaybackConfig PlaybackConfig配置，见PlaybackConfig.js
	 * @param {Array} resps 回放的接口数据数组，包含比对结果
	 */
	static async doInterfaceTest(request, reqs,PlaybackConfig,resps) {
		await Util.foreachUrl(reqs, async (req,count) => {
			await Util.requestEachUrl(request, req,count,reqs,PlaybackConfig,resps);
		});
		return resps;
	}

	/**
	 * 发送单条请求获取响应
	 * @param {object}  page page对象
	 * @param {object} request request对象
	 * @param {string}  requestUrl url
	 * @param {string}  requestMethod 请求方法，post/get
	 * @param {object}  requestHeaders header
	 * @param {string}  requestBody body
	 * @param {function}  sendcallback 回调函数
	 */
	static async sendRequest(request, requestUrl, requestMethod, requestHeaders, requestBody, sendcallback) {
		var options = {
			url: requestUrl,
			method: requestMethod,
			headers: requestHeaders,
			body: requestBody
		};
		//console.log(options);
		await request(options, function callback(error, response, body) {
			if (!error) {
				var data = JSON.parse(body);
				//console.log('1:' , data);
				//console.log(response.statusCode);
				//console.log(response.headers);
				//console.log(data);
				console.log(data['success'], ':', requestUrl);
				return sendcallback({
					statusCode: response.statusCode,
					headers: response.headers,
					success: data['success'],
					data: data
				});
			} else {
				return sendcallback({
					error: error
				});
			}
		});
	}	

	static getAllJson(jsons,path,map){
		if(jsons instanceof Array) {
			for (var i = 0; i < jsons.length; i++) {
				Util.getAllJson(jsons[i], path + '[' + i + ']', map);
			}
		}else if(jsons instanceof Object){
			for(var key in jsons) {
				Util.getAllJson(jsons[key], path + "-" + key, map);
			}
		}else{
			map[path] = jsons;
		}
	}

	static splitRequestBody(url,json) {
		var arr = url.split("&");
		//var json = {};
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].indexOf("=") != -1) {
				json[arr[i].split("=")[0]] = arr[i].split("=")[1];
			} else {
				json[arr[i]] = "";
			}
		}	
		//console.log(json);
	}

	static combineRequestBody(json) {
		let url = '';
		for(var key in json) {
			url += key+'='+json[key]+'&';
		}
		if(url.endsWith('&')){
			url = url.substr(0,url.length-1);
		}
		return url;
	}

	static compareJsons(jsons,jsonsAfter,jsonsDiff){		
		for(var key in jsons){
			let escape = false;
			if(PlaybackConfig.escape_key && PlaybackConfig.escape_key.length>0){
				for(let index in PlaybackConfig.escape_key){
					let escapeKey = PlaybackConfig.escape_key[index];
					if(key.toLowerCase().indexOf(escapeKey.toLowerCase())>0){
						escape = true;
						break;
					}
				}
			}
			if(escape){
				continue;
			}
			if(jsonsAfter[key]==jsons[key]){
				//一致
			}else{
				//jsonsDiff.push(String(key) + 'expect:' + String(jsons[key])+ '|real:' + String(jsonsAfter[key]));
				let diff = new Map();
				diff.set('expect',String(jsons[key]));
				diff.set('real',String(jsonsAfter[key]));
				jsonsDiff.set(String(key) , diff);
			}
		}
	}

	static mapToObj(strMap){
		let obj= Object.create(null);
		for (let[k,v] of strMap) {
		  obj[k] = v;
		}
		return obj;	
	}

}

class UsageFormatter {
	constructor(stats) {
		this.stats = stats;
	}
	static eventLabel(event) {
		// const maxEventLabelLen = EVENTS.reduce((currMax, event) => Math.max(currMax, event.length), 0);
		// const eventLabel = event + ' '.repeat(maxEventLabelLen - event.length);
		return chalk.magenta(event);
	}
	summary(used = this.stats.usedBytes, total = this.stats.totalBytes) {
		const percent = Math.round((used / total) * 100);
		return `${Util.formatBytesToKB(used)}/${Util.formatBytesToKB(total)} (${percent}%)`;
	}

	shortSummary(used, total = this.stats.totalBytes) {
		const percent = Math.round((used / total) * 100);
		return used ? `${Util.formatBytesToKB(used)} (${percent}%)` : 0;
	}

	/**
	 * Constructors a bar chart for the % usage of each value.
	 * @param {!{jsUsed: number, cssUsed: number, totalBytes: number}=} stats Usage stats.
	 * @return {string}
	 */
	barGraph(stats = this.stats) {
		// const MAX_TERMINAL_CHARS = process.stdout.columns;
		const maxBarWidth = 30;
		const jsSegment = ' '.repeat((stats.jsUsed / stats.totalBytes) * maxBarWidth);
		const cssSegment = ' '.repeat((stats.cssUsed / stats.totalBytes) * maxBarWidth);
		const unusedSegment = ' '.repeat(maxBarWidth - jsSegment.length - cssSegment.length);
		return chalk.bgRedBright(jsSegment) + chalk.bgBlueBright(cssSegment) +
			chalk.bgBlackBright(unusedSegment);
	}
}

module.exports = Util;