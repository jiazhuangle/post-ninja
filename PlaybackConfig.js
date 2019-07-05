/**
 * 配置信息
 */
module.exports = {
	'host': '192.168.23.38:8080',
	'port': '8080',
	'host_name': '192.168.23.38',

	'playback_testcase_id_or': {
		"$or": [
			//{"testcaseId": 'aosplus-interface-001'},
			{"testcaseId": 'aosplus-interface-004'},
			//{"testcaseId":'aisino-OperationManager-001'},
		]
	},

	/*'playback_testcase_id_in': {//比or慢
		"testcaseId" : {
			"$in": [
				//'aosplus-interface-001',
				'aosplus-interface-002'
			]
		}
	},*/

	'replace_key': [
		'cGuid',
		'orgnId'
	],
	'replace_key_minlength':18,
	'escape_key': [
		'script',
		'cguid'
	]
};