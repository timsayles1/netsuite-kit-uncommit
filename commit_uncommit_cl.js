if (nlapiGetField('custpage_itemcat')) {
	showAlertBox('INFO','Loading..', 'Loading Data. Please Wait...');
}
var kits, cats, items, errors;
jQuery.getScript('https://cdnjs.cloudflare.com/ajax/libs/jquery-confirm/3.3.4/jquery-confirm.min.js');
jQuery('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-confirm/3.3.4/jquery-confirm.min.css">')

function refreshOrders(kit) {
	nlapiRemoveLineItem('custpage_corders',null);
	var searchFilters = [];
	searchFilters.push(['status','anyof','SalesOrd:B']);
	searchFilters.push("AND");
	searchFilters.push(['mainline','is','F']);
	searchFilters.push("AND");
	searchFilters.push(['taxline','is','F']);
	searchFilters.push("AND");
	searchFilters.push(['item.internalid','is',kit]);
	searchFilters.push("AND");
	searchFilters.push([["quantitypacked","equalto","0"],"AND",["quantitypicked","equalto","0"]]);
	searchFilters.push("AND");
	searchFilters.push(['quantitycommitted','notequalto','0']);
	var orderSearch = nlapiSearchRecord("transaction",null, searchFilters,
	[
	   new nlobjSearchColumn("entity",null,"GROUP"), 
	   new nlobjSearchColumn("internalid",null,"GROUP"), 		   
	   new nlobjSearchColumn("tranid",null,"GROUP"), 
	   new nlobjSearchColumn("trandate",null,"GROUP"), 
	   new nlobjSearchColumn("quantity",null,"SUM"), 
	   new nlobjSearchColumn("quantitycommitted",null,"SUM"), 
	   new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)")
	]
	);
	if (orderSearch && orderSearch.length > 0) {
		for (var i = 0; i < 1; i++) {
			nlapiSelectNewLineItem('custpage_corders');
			Object.entries(orderSearch[i].valuesByKey).forEach(function(key) {
				var cellValue = !key[1].text ? key[1].value ? key[1].value : 0 : key[1].text;
				nlapiSetCurrentLineItemValue('custpage_corders',key[1].name,cellValue);
				return true;
			});
			nlapiCommitLineItem('custpage_corders');
		}
	}
	return true;
}

function returnHome(script, deploy) {
	window.open(nlapiResolveURL('SUITELET',nlapiGetFieldValue('custpage_script_id'),nlapiGetFieldValue('custpage_deploy_id')));
}

function pageInit(context) {
	nlapiRemoveSelectOption('custpage_kititem',null);
	nlapiRemoveSelectOption('custpage_itemcat',null);
	nlapiInsertSelectOption('custpage_kititem','','',true);
	nlapiInsertSelectOption('custpage_itemcat','','',true);
	items = {};
	cats = [];
	kits = [];
	var sKit = Number(nlapiGetFieldValue('custpage_kititem_param'))||Number(nlapiGetFieldValue('custpage_kititem'))||'';
	var sItemCat = nlapiGetFieldValue('custpage_itemcat_param')||nlapiGetFieldValue('custpage_itemcat')||'Kit';
	var kititemSearch = nlapiSearchRecord("item",null,
		[
		   ["isinactive","is","F"]
		], 
		[
		   new nlobjSearchColumn("internalid"), 
		   new nlobjSearchColumn("type"), 	   
		   new nlobjSearchColumn("itemid"), 
		   new nlobjSearchColumn("displayname")
		]
	);
	if (kititemSearch && kititemSearch.length > 0) {
		for (var i = 0; i < kititemSearch.length; i++) {
			var itemType = kititemSearch[i].getValue('type'); 
			if (!cats.includes(itemType)) {
				cats.push(itemType);
				items[itemType] = [];
			}
		}
		cats.forEach(function(c) {
			nlapiInsertSelectOption('custpage_itemcat', c, c, sItemCat == c);
			for (var i = 0; i < kititemSearch.length; i++) {
				var itemType = kititemSearch[i].getValue('type'); 
				if (itemType == c) {
					var catLine = {};
					catLine.id = Number(kititemSearch[i].getValue('internalid'));
					catLine.name = kititemSearch[i].getValue('itemid') + ' ' + kititemSearch[i].getValue('displayname');
					items[itemType].push(catLine);
					if (itemType == 'Kit') {
						kits.push(catLine);
					}
				}
			}
			return true;
		});
		items[sItemCat].forEach(function(i) {
			nlapiInsertSelectOption('custpage_kititem', Number(i.id), i.name, Number(i.id) == Number(sKit));
			return true;
		});
	}
	if (sKit) {
		for (var i = 1; i <= nlapiGetLineItemCount('custpage_corders'); i++) {
			nlapiSetLineItemValue('custpage_corders','custpage_uncommit',i,Number(nlapiGetLineItemValue('custpage_corders','quantitycommitted_sum',i)));
		}
	}
	hideAlertBox('INFO')
	return true;
}

function commitOnly() {
	jQuery.confirm({
		title: 'Commit Only',
		content: 'This will only attempt to commit selected orders from available inventory.',
		boxWidth: '50%',
		useBootstrap: false,
		type: 'blue',
		buttons: {
			proceed: function() {
				for (var e = 1; e <= nlapiGetLineItemCount('custpage_uorders'); e++) {
					if (nlapiGetLineItemValue('custpage_uorders','custpage_update',e) == 'T') {
						try {
							var isoid = Number(nlapiGetLineItemValue('custpage_uorders','internalid_group',e));
							var uso = nlapiLoadRecord('salesorder',isoid);
							var usoRecId = nlapiSubmitRecord(uso);
						}
						catch(e) {alert('Commit error: ' + e.message); break;}
					}
				}
			},
			cancel: function() {
			}
		},
		onDestroy: function() {
			jQuery.confirm({
				title:  nlapiGetFieldText('custpage_kititem'),
				content: 'Commitment processing complete.<br>',
				boxWidth: '50%',
				useBootstrap: false,
				type: 'blue',
				buttons: {
					okay: function () {
						window.onbeforeunload = null;
						location.reload();
					}
				}
			});
		}
	});
}
function resetPage() {
	var queryString = window.location.search;
	var urlParams = new URLSearchParams(queryString);
	urlParams.delete('kititem');
	var href = window.location.origin + window.location.pathname + '?';
	var entries = urlParams.entries();
	entries.forEach(function(entry) {
		href += entry[0]+'='+entry[1]+'&';
		return true;
	});
	window.open(href,'_self');	
	return true;
}
	
function fieldChanged(type,name,line) {
	if (name == 'custpage_itemcat' || name == 'custpage_kititem') {
		var itemCat = nlapiGetFieldValue('custpage_itemcat')||'';
		var kitItem = nlapiGetFieldValue('custpage_kititem')||'';
		var pCat = nlapiGetFieldValue('custpage_kititem_param')||'';
		var pKit = nlapiGetFieldValue('custpage_itemcat_param')||'';
		var queryString = window.location.search;
		var urlParams = new URLSearchParams(queryString);
		urlParams.set('itemcat',encodeURIComponent(itemCat));
		urlParams.set('kititem',encodeURIComponent(kitItem));
		var href = window.location.origin + window.location.pathname + '?';
		var entries = urlParams.entries();
		if (entries) {
			entries.forEach(function(entry) {
				href += entry[0]+'='+entry[1]+'&';
				return true;
			});
			window.onbeforeunload = null;
			window.open(href,'_self');
		}
		else {
			alert('Error: Browser incompatible!');
		}
	}
	return true;
}

function refresh(type, name, line) {
	console.log('Refresh trigger');
	return true;
}

function reallocate() {
	var cLineCount = 0;
	var uLineCount = 0;
	for (var i = 1; i <= nlapiGetLineItemCount('custpage_corders'); i++) {
		if (nlapiGetLineItemValue('custpage_corders','custpage_update',i) == 'T') {
			cLineCount++;
		}
	}
	for (var i = 1; i <= nlapiGetLineItemCount('custpage_uorders'); i++) {
		if (nlapiGetLineItemValue('custpage_uorders','custpage_update',i) == 'T') {
			uLineCount++;
		}
	}
	if (cLineCount > 1 || uLineCount > 1) {
		jQuery.confirm({
			title: 'Alert',
			content: 'You can only commit/uncommit one order at a time.',
			boxWidth: '50%',
			useBootstrap: false,
			type: 'orange',
			buttons: {
				close: function() {
				}
			}
		});
	}
	if (cLineCount == uLineCount) {
		var item = nlapiGetFieldValue('custpage_kititem')||'';
		if (item) {
			jQuery.confirm({
				title:  nlapiGetFieldText('custpage_kititem'),
				content: 'This process will take a minute and screen may appear to freeze.',
				boxWidth: '50%',
				useBootstrap: false,
				type: 'blue',
				buttons: {
					cancel: function () {
					},
					proceed: function () {
						var orderLines = [];
						for (var a = 1; a <= nlapiGetLineItemCount('custpage_corders'); a++) {
							if (nlapiGetLineItemValue('custpage_corders','custpage_update',a) == 'T') {
								var deleteLines = [];
								var uqty = Number(nlapiGetLineItemValue('custpage_corders','custpage_uncommit',a));
								var isoid = Number(nlapiGetLineItemValue('custpage_corders','internalid_group',a));
								var uso = nlapiLoadRecord('salesorder',isoid);
								for (var b = 1; b < uso.getLineItemCount('item'); b++) {
									if (Number(uso.getLineItemValue('item','lineuniquekey',b)) == Number(nlapiGetLineItemValue('custpage_corders','lineuniquekey_group',a))) {
										var dLine = {};
										dLine.order = uso.id;
										dLine.line = b;
										dLine.item = Number(uso.getLineItemValue('item','item',b));
										dLine.key = Number(uso.getLineItemValue('item','lineuniquekey',b));
										dLine.tqty = Number(uso.getLineItemValue('item','quantity',b));
										dLine.cqty = Number(uso.getLineItemValue('item','quantitycommitted',b));
										dLine.type = uso.getLineItemValue('item','itemtype',b);
										dLine.pricelevel = Number(uso.getLineItemValue('item','price',b));
										dLine.rate = Number(uso.getLineItemValue('item','rate',b));
										dLine.amount = Number(uso.getLineItemValue('item','amount',b));
										dLine.class = uso.getLineItemValue('item','class',b)||'';
										dLine.commit = uso.getLineItemValue('item','commitinventory',b)||'';
										deleteLines.push(dLine);
										if (b+1 <= uso.getLineItemCount('item') && uso.getLineItemValue('item','itemtype',b+1) == 'Discount') {
											var dLine = {};
											dLine.order = uso.id;
											dLine.line = b+1;
											dLine.item = Number(uso.getLineItemValue('item','item',b+1));
											dLine.type = uso.getLineItemValue('item','itemtype',b+1);
											dLine.pricelevel = Number(uso.getLineItemValue('item','price',b+1));
											deleteLines.push(dLine);
										}
									}
								}
								deleteLines.sort().reverse();
								for (var c = 0; c < deleteLines.length; c++) {
									uso.removeLineItem('item',deleteLines[c].line);
								}
								deleteLines.sort().reverse();
								for (var d = 0; d < deleteLines.length; d++) {
									try {
										if (deleteLines[d].type != 'Discount') {
											deleteLines[d].oqty = deleteLines[d].cqty - uqty;
											uso.selectNewLineItem('item');
											uso.setCurrentLineItemValue('item','item',deleteLines[d].item);
											uso.setCurrentLineItemValue('item','quantity',deleteLines[d].oqty);
											uso.setCurrentLineItemValue('item','price',deleteLines[d].pricelevel);
											uso.setCurrentLineItemValue('item','rate',deleteLines[d].rate);
											uso.setCurrentLineItemValue('item','amount',deleteLines[d].rate * deleteLines[d].oqty);
											if (deleteLines[d].class) {
												uso.setCurrentLineItemValue('item','class',deleteLines[d].class);
											}
											uso.commitLineItem('item');
											deleteLines[d].newline = uso.getLineItemCount('item');
											orderLines.push(deleteLines[d]);
										}
										else {
											uso.selectNewLineItem('item');
											uso.setCurrentLineItemValue('item','item',deleteLines[d].item);
											uso.setCurrentLineItemValue('item','price',deleteLines[d].pricelevel);
											uso.commitLineItem('item');
											deleteLines[d].newline = uso.getLineItemCount('item');
										}
									}
									catch(e) {alert('Un-Commit error: ' + e.message); break;}
								}
								var usoRecId = nlapiSubmitRecord(uso);
							}
						}
						for (var e = 1; e <= nlapiGetLineItemCount('custpage_uorders'); e++) {
							if (nlapiGetLineItemValue('custpage_uorders','custpage_update',e) == 'T') {
								try {
									var isoid = Number(nlapiGetLineItemValue('custpage_uorders','internalid_group',e));
									var uso = nlapiLoadRecord('salesorder',isoid);
									var usoRecId = nlapiSubmitRecord(uso);
								}
								catch(e) {alert('Commit error: ' + e.message); break;}
							}
						}
						for (var f = 0; f < orderLines.length; f++) {
							try {
								var uso = nlapiLoadRecord('salesorder',orderLines[f].order);
								uso.setLineItemValue('item','quantity',orderLines[f].newline,deleteLines[f].tqty);
								var usoRecId = nlapiSubmitRecord(uso);
							}
							catch(e) {alert('Re-Commit error: ' + e.message); break;}
						}
					}
				},
				onDestroy: function() {
					jQuery.confirm({
						title:  nlapiGetFieldText('custpage_kititem'),
						content: 'Commitment processing complete.<br>',
						boxWidth: '50%',
						useBootstrap: false,
						type: 'blue',
						buttons: {
							okay: function () {
								window.onbeforeunload = null;
								location.reload();
							}
						}
					});
				}
			});
		}
	}
}
