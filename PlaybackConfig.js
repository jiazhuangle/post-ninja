/**
 * 配置信息
 */
module.exports = {
	'host': 'XXX.XXX.XX.XX:8080',
	'port': '8080',
	'host_name': 'XXX.XXX.XX.38',

	'playback_testcase_id_or': {
		"$or": [
			//{"testcaseId": 'example-interface-001'},
			{"testcaseId": 'example-interface-004'},
			//{"testcaseId":'example-OperationManager-001'},
		]
	},



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