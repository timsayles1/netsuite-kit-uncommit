function mainApp(request, response) {
	if (request.getMethod() == 'GET') {
		var sItemCat = request.getParameter('itemcat')||'Kit';
		var sKit = Number(request.getParameter('kititem'))||'';
		var form = nlapiCreateForm('Inventory Commitments');
		form.addField('custpage_itemcat','select','Category',null);
		form.addField('custpage_kititem','select','Kit',null);
		form.addField('custpage_kititem_param','text','Kit Item',null).setDisplayType('hidden').setDefaultValue(Number(decodeURIComponent(request.getParameter('kititem')))||'');
		form.addField('custpage_itemcat_param','text','Item Category',null).setDisplayType('hidden').setDefaultValue(decodeURIComponent(request.getParameter('itemcat'))||'Kit');
		form.setScript('customscript_commit_uncommit_cl'); //Set to script ID of client script record.
		form.addTab('custpage_commitp','Committed Orders');
		form.addTab('custpage_uncommitp','Uncommitted Orders');
		var list = form.addSubList('custpage_corders','list','Committed Qty','custpage_commitp');
		form.addButton('custpage_reloadbtn','Reset Filters','resetPage()');
		clist.addField('custpage_update','checkbox','Uncommit');
		clist.addField('custpage_uncommit','integer','Uncommit Qty').setDisplayType('entry');
		clist.addField('internalid_group','integer','Record ID').setDisplayType('hidden');
		clist.addField('tranid_group','text','Transaction');
		clist.addField('entity_group_display','text','Customer');
		clist.addField('trandate_group','date','Order Date');
		clist.addField('lineuniquekey_group','text','Line Key');
		clist.addField('quantitycommitted_sum','text','Order Committed');
		clist.addField('formulanumeric_sum','text','Order Backordered');
		clist.addField('quantity_sum','text','Order Quantity');
		clist.setAmountField('custpage_uncommit');
		if (sItemCat && sKit) {
			nlapiLogExecution('DEBUG',sItemCat,sKit);
			var commitFilters = [];
			commitFilters.push(['status','anyof','SalesOrd:B']);
			commitFilters.push("AND");
			commitFilters.push(['mainline','is','F']);
			commitFilters.push("AND");
			commitFilters.push(['taxline','is','F']);
			commitFilters.push("AND");
			commitFilters.push(['item.internalid','is',sKit]);
			commitFilters.push("AND");
			commitFilters.push(['item.type','is',sItemCat]);
			commitFilters.push("AND");
			commitFilters.push([["quantitypacked","equalto","0"],"AND",["quantitypicked","equalto","0"]]);
			commitFilters.push("AND");
			commitFilters.push(["quantitycommitted","isnotempty","0"]);
			var orderSearch = nlapiSearchRecord("transaction",null, commitFilters,
			[
			   new nlobjSearchColumn("entity",null,"GROUP"), 
			   new nlobjSearchColumn("internalid",null,"GROUP"), 		   
			   new nlobjSearchColumn("tranid",null,"GROUP"),
			   new nlobjSearchColumn("lineuniquekey",null,"GROUP"), 			   
			   new nlobjSearchColumn("trandate",null,"GROUP"), 
			   new nlobjSearchColumn("quantity",null,"SUM"), 
			   new nlobjSearchColumn("quantitycommitted",null,"SUM"), 
			   new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)")
			]
			);
			if (orderSearch && orderSearch.length > 0) {
				clist.setLineItemValues(orderSearch);
			}
		}
		var list2 = form.addSubList('custpage_uorders','list','Uncommitted Orders','custpage_uncommitp');
		ulist.addField('custpage_update','checkbox','Commit');
		ulist.addField('internalid_group','integer','Record ID').setDisplayType('hidden');
		ulist.addField('tranid_group','text','Transaction');
		ulist.addField('entity_group_display','text','Customer');
		ulist.addField('trandate_group','date','Order Date');
		ulist.addField('lineuniquekey_group','text','Line Key');
		ulist.addField('quantitycommitted_sum','text','Order Committed');
		ulist.addField('formulanumeric_sum','text','Order Backordered');
		ulist.addField('quantity_sum','text','Order Quantity');
		if (sItemCat && sKit) {
			nlapiLogExecution('DEBUG',sItemCat,sKit);
			var uncfilters = [];
			uncfilters.push(['status','anyof','SalesOrd:B']);
			uncfilters.push("AND");
			uncfilters.push(['mainline','is','F']);
			uncfilters.push("AND");
			uncfilters.push(['taxline','is','F']);
			uncfilters.push("AND");
			uncfilters.push(['item.internalid','is',sKit]);
			uncfilters.push("AND");
			uncfilters.push(['item.type','is',sItemCat]);
			uncfilters.push("AND");
			uncfilters.push([["quantitypacked","equalto","0"],"AND",["quantitypicked","equalto","0"]]);
			uncfilters.push("AND");
			uncfilters.push(["quantitycommitted","isempty","0"]);
			var uncommitSearch = nlapiSearchRecord("transaction",null, uncfilters,
			[
			   new nlobjSearchColumn("entity",null,"GROUP"), 
			   new nlobjSearchColumn("internalid",null,"GROUP"), 		   
			   new nlobjSearchColumn("tranid",null,"GROUP"), 
			   new nlobjSearchColumn("lineuniquekey",null,"GROUP"), 			
			   new nlobjSearchColumn("trandate",null,"GROUP"), 
			   new nlobjSearchColumn("quantity",null,"SUM"), 
			   new nlobjSearchColumn("quantitycommitted",null,"SUM"), 
			   new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)")
			]
			);
			if (orderSearch && orderSearch.length > 0) {
				ulist.setLineItemValues(uncommitSearch);
			}
		}
		form.addButton('custpage_revise','Revise Selected','reallocate()');
		response.writePage(form);
	}
	else {	
		nlapiLogExecution('DEBUG','Post','Post');
	}
}