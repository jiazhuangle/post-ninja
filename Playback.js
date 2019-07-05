const mongodb = require('mongodb').MongoClient;
const MongoDBConfig = require('./MongoDBConfig');
const request = require('request').defaults({
	jar: true
});
const Util = require("./Common");

const PlaybackConfig = require('./PlaybackConfig');

(async () => {
	let rets = [];
	resps = [];
	await mongodb.connect(MongoDBConfig.url, {
		useNewUrlParser: true
	}, async function (err, db) {
		if (err) throw err;
		const puppeteerdb = await db.db(MongoDBConfig.db);
		const interface_collection = await puppeteerdb.collection(MongoDBConfig.interface_collection);
		//let wherestr = {"$or": PlaybackConfig.playback_testcase_id};
		await interface_collection.find(PlaybackConfig.playback_testcase_id_or).toArray(async function(err, result) {
			if (err) throw err;
			//console.log(result.length);
			rets = result;
			
			await Util.doInterfaceTest(request, rets,PlaybackConfig,resps);			  
			console.log(resps.length);

			if(resps){
				const interfaceExec_collection = await puppeteerdb.collection(MongoDBConfig.interfaceExec_collection);
				await interfaceExec_collection.insertMany(resps, function (err, res) {
					if (err) throw err;
					console.log("insert " + resps.length+ " records.");
					//db.close();
				});
			}
			await db.close();
		});
	});

})();