sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/util/Export",
	"sap/ui/core/util/ExportTypeCSV",
	"bosch/ma/Extractor/resource/xlsxFullMin",
	"sap/m/Dialog"
], function (Controller, History, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Export, ExportTypeCSV, xlsxFullMin, Dialog) {
	"use strict";

	return Controller.extend("bosch.ma.Extractor.controller.BaseController", {

		/**
		 * Lifecycle Method
		 */
		onInit: function () {
			this.oModel = this.getOwnerComponent().getModel();
			this.getView().setModel(new JSONModel(), "ExtractionGlobalJSONModel");
			this._oUpdateODataModel = this.getOwnerComponent().getModel("ExtractionModel");
		},
		
		/** 
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		setBusyDialog: function () {
			this.getOwnerComponent().BusyDialogGlobal.open();
		},

		destroyBusyDialog: function () {
			this.getOwnerComponent().BusyDialogGlobal.close();
		},

		getMasterDetails: function (sPrjId, sModId, sMigObjId, sVersion) {
			// get Project Details
			var sPathprj = "/ProjectSet('" + sPrjId + "')";
			this.getProjModMigObjDetails(sPathprj, "ProjectSet", sVersion);

			// get Module Details
			var sPathmodid = "/ModuleSet('" + sModId + "')";
			this.getProjModMigObjDetails(sPathmodid, "ModuleSet", sVersion);

			// get Migration Object Details
			var sPathMigObjid = "/MigrObjSet('" + sMigObjId + "')";
			this.getProjModMigObjDetails(sPathMigObjid, "MigrObjSet", sVersion);

			// get Active Rules
			this.getActiveRules(sPrjId, sModId, sMigObjId, sVersion, this, "aRuleSet");
		},

		/**
		 * Below Method is triggered whenever the user presses the project link
		 */
		_onPressPjt: function (oEvt) {
			if (!this._projectDetail) {
				this._projectDetail = sap.ui.xmlfragment(
					"bosch.ma.Extractor.fragment.projectDetailDialog",
					this
				);
			}
			this.getView().addDependent(this._projectDetail);
			var oPjtdetail = this.getModel("ExtractionGlobalJSONModel").getProperty("/ProjectSet");
			if (oPjtdetail.Version === "B") {
				this._projectDetail.setTitle(" Bosch Project");
			} else if (oPjtdetail.Version === "C") {
				this._projectDetail.setTitle(" Customer Project");
			}
			this._projectDetail.open();
		},

		_onCloseDetails: function () {
			this._projectDetail.close();
		},

		_onModuleCloseDetails: function () {
			this._moduleDialog.close();
		},

		/**
		 * Below Method is triggered whenever the user presses the modules link
		 */
		_onPressModules: function (oEvt) {
			if (!this._moduleDialog) {
				this._moduleDialog = sap.ui.xmlfragment(
					"bosch.ma.Extractor.fragment.moduleDetailDialog",
					this
				);
			}
			this.getView().addDependent(this._moduleDialog);
			var oModDetail = this.getModel("ExtractionGlobalJSONModel").getProperty("/ModuleSet");
			if (oModDetail.Version === "B") {
				this._moduleDialog.setTitle(" Bosch Project");
			} else {
				this._moduleDialog.setTitle(" Customer Project");
			}
			this._moduleDialog.open();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			if (sName !== undefined) {
				return this.getView().getModel(sName);
			} else {
				return this.getOwnerComponent().getModel();
			}
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		onSearch: function (oEvent) {
			var searchStr = oEvent.getParameter("value");
			var aFilter = [];
			aFilter.push(new sap.ui.model.Filter("Fname", sap.ui.model.FilterOperator.Contains, searchStr));
			aFilter.push(new sap.ui.model.Filter("Desc", sap.ui.model.FilterOperator.Contains, searchStr));
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter(new sap.ui.model.Filter(aFilter), false);
		},

		/**
		 * Get Project or Module or Migration Object details based on the request.
		 * 
		 */
		getProjModMigObjDetails: function (sPath, sEntity, sVersion) {
			var that = this;
			this.oModel.read(sPath, {
				success: function (oData) {
					that.getView().getModel("ExtractionGlobalJSONModel").setProperty("/" + sEntity + "", oData);
				},
				error: function (oError) {
					// handler function for all error status is written in base controller
					that.handleErrorLog(oError);
				}
			});
		},

		/**
		 * Get Active rules.
		 * 
		 */
		getActiveRules: function (sProject, sModule, sMigrObj, sVersion, oRefThis) {
			var aRuleMapping = [];
			var that = this;
			var oThis = oRefThis;
			this.oModel.read("/RulesMappingSet", {
				filters: [
					new sap.ui.model.Filter("PjId", sap.ui.model.FilterOperator.EQ, sProject),
					new sap.ui.model.Filter("MoId", sap.ui.model.FilterOperator.EQ, sModule),
					new sap.ui.model.Filter("MiObId", sap.ui.model.FilterOperator.EQ, sMigrObj),
					new sap.ui.model.Filter("Version", sap.ui.model.FilterOperator.EQ, sVersion),
					new sap.ui.model.Filter("Active", sap.ui.model.FilterOperator.EQ, "X")
				],
				success: function (data) {
					var aRuleSet = data.results;
					for (var i = 0; i < aRuleSet.length; i++) {
						aRuleMapping.push({
							Active: (aRuleSet[i].Active === "X") ? true : false,
							Aedat: aRuleSet[i].Aedat,
							Aenam: aRuleSet[i].Aenam,
							ChangeFlg: "X",
							GenerateDist: (aRuleSet[i].GenerateDist === "X") ? true : false,
							MiObId: aRuleSet[i].MiObId,
							MoId: aRuleSet[i].MoId,
							Version: sVersion,
							PjId: sProject,
							RefSeqNr: aRuleSet[i].RefSeqNr.replace(/^0+/, ""),
							RuDesc: aRuleSet[i].RuDesc,
							RuId: aRuleSet[i].RuId,
							RuVersion: sVersion,
							RuleMod: (aRuleSet[i].RuleMod === "I") ? "true" : "false",
							SeqNr: aRuleSet[i].SeqNr.replace(/^0+/, ""),
							UnionFlag: (aRuleSet[i].UnionFlag === "X") ? true : false
						});
					}
					that.getView().getModel("ExtractionGlobalJSONModel").setProperty("/aRuleSet", aRuleMapping);
					sap.ui.getCore().setModel(that.getView().getModel("ExtractionGlobalJSONModel"), "ExtractionGlobalJSONModel");
					var aRows = oThis.getView().byId("__activeRules").getItems();
					var aRowData = that.getView().getModel("ExtractionGlobalJSONModel").getProperty("/aRuleSet");
					for (var j = 0; j < aRows.length; j++) {
						if (aRowData[j]) {
							var oCell = aRows[j].getCells();
							var sSelectedKey = aRowData[j].RuleMod;
							var aSegButtonProperty = oCell[3].getAggregation("buttons");
							if (sSelectedKey === "true") {
								aSegButtonProperty[1].removeStyleClass("buttonColorNormal");
								aSegButtonProperty[1].removeStyleClass("buttonColorExclude");
							} else if (sSelectedKey === "false") {
								aSegButtonProperty[1].removeStyleClass("buttonColorNormal");
								aSegButtonProperty[1].addStyleClass("buttonColorExclude");
							}
						}
					}
					that.destroyBusyDialog();
				},
				error: function (oError) {
					// handler function for all error status is written in base controller
					that.handleErrorLog(oError);
				}
			});
		},

		fillTokenValue: function (sIdFrom, sIdTo, sFName, bIsDate, aSelectedTokens) {
			if (bIsDate === true) {
				this.getDateValues(sIdFrom, sIdTo, sFName, aSelectedTokens);
			} else {
				this.getTokenValues(sIdFrom, sIdTo, sFName, aSelectedTokens);
			}
			return aSelectedTokens;
		},

		/**
		 * Method to fill the values from the excel uploaded.
		 * @private
		 */
		_fillExcelValue: function (sModel, sFieldName, aSelectedTokens) {
			var aSelectedKey = this.getView().getModel(sModel).getProperty("/" + sFieldName);
			aSelectedTokens.push.apply(aSelectedTokens, aSelectedKey);
			return aSelectedTokens;
		},

		getDateValues: function (sIdFrom, sIdTo, sFName, aSelectedTokens) {
			var aSelectedKeysFrom = [],
				aSelectedKeysTo = [],
				aSelectedKey = [];
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyyMMdd"
			});
			var dateFromVal = this.byId(sIdFrom).getProperty("dateValue");
			if (dateFromVal) {
				var dateFrom = oDateFormat.format(dateFromVal);
			}
			if (sIdTo !== " ") {
				var dateToVal = this.byId(sIdTo).getProperty("dateValue");
				if (dateToVal) {
					var dateTo = oDateFormat.format(dateToVal);
				}
			}
			if (dateFrom !== undefined && dateTo !== undefined) {
				aSelectedKey.push({
					"Fname": sFName,
					"Option": "BT",
					"Sign": "I",
					"Low": dateFrom,
					"High": dateTo
				});
				aSelectedTokens.push.apply(aSelectedTokens, aSelectedKey);
			} else if (dateFrom !== undefined && dateTo === undefined) {
				aSelectedKeysFrom.push({
					"Fname": sFName,
					"Option": "EQ",
					"Sign": "I",
					"Low": dateFrom,
					"High": ""
				});
				aSelectedTokens.push.apply(aSelectedTokens, aSelectedKeysFrom);
			} else if (dateFrom === undefined && dateTo !== undefined) {
				aSelectedKeysTo.push({
					"Fname": sFName,
					"Option": "EQ",
					"Sign": "I",
					"Low": "",
					"High": dateTo
				});
				aSelectedTokens.push.apply(aSelectedTokens, aSelectedKeysTo);
			}
			return aSelectedTokens;
		},

		getTokenValues: function (sIdFrom, sIdTo, sFName, aSelectedTokens) {
			var aSelectedKeysFrom = [],
				aSelectedKeysTo = [],
				aSelectedKey = [];
			var bFrom, bTo;
			var aTokensFrom = this.byId(sIdFrom).getTokens();
			var aTokensTo = this.byId(sIdTo).getTokens();
			for (var i = 0; i < aTokensFrom.length; i++) {
				aSelectedKeysFrom.push({
					"Fname": sFName,
					"Option": "EQ",
					"Sign": "I",
					"Low": aTokensFrom[i].getKey(),
					"High": ""
				});
				bFrom = true;
			}
			if (aTokensFrom.length === 0) {
				var sLow = this.byId(sIdFrom).getValue();
				sLow.toUpperCase();
				if (sLow !== "") {
					aSelectedKeysFrom.push({
						"Fname": sFName,
						"Option": "EQ",
						"Sign": "I",
						"Low": sLow,
						"High": ""
					});
					bFrom = true;
				}
			}
			for (var j = 0; j < aTokensTo.length; j++) {
				aSelectedKeysTo.push({
					"Fname": sFName,
					"Option": "EQ",
					"Sign": "I",
					"Low": "",
					"High": aTokensTo[j].getKey()
				});
				bTo = true;
			}
			if (aTokensTo.length === 0) {
				var sHigh = this.byId(sIdTo).getValue();
				sHigh.toUpperCase();
				if (sHigh !== "") {
					aSelectedKeysTo.push({
						"Fname": sFName,
						"Option": "EQ",
						"Sign": "I",
						"Low": "",
						"High": sHigh
					});
					bTo = true;
				}
			}
			if (bFrom === true && bTo === true) {
				aSelectedKey.push({
					"Fname": sFName,
					"Option": "BT",
					"Sign": "I",
					"Low": aSelectedKeysFrom[0].Low,
					"High": aSelectedKeysTo[0].High
				});
				aSelectedTokens.push.apply(aSelectedTokens, aSelectedKey);
			} else {
				if (aSelectedKeysFrom.length > 0) {
					aSelectedTokens.push.apply(aSelectedTokens, aSelectedKeysFrom);
				}
				if (aSelectedKeysTo.length > 0) {
					aSelectedTokens.push.apply(aSelectedTokens, aSelectedKeysTo);
				}
			}
			return aSelectedTokens;
		},

		_getSelectedOption: function (sId, sFName, aSelectedTokens) {
			if (this.getView().byId(sId).getSelected() === true) {
				aSelectedTokens.push({
					"Fname": sFName,
					"Option": "EQ",
					"Sign": "I",
					"Low": "X",
					"High": ""
				});
			}
			return aSelectedTokens;
		},

		/**
		 * Method to get the value from the selected Input which has switch control
		 * @public
		 */
		_getSwitchValue: function (sId, sFName, aSelectedTokens) {
			if (this.getView().byId(sId).getState() === true) {
				aSelectedTokens.push({
					"Fname": sFName,
					"Option": "EQ",
					"Sign": "I",
					"Low": "X",
					"High": ""
				});
			}
			return aSelectedTokens;
		},
		
		/**
		 * Method to get the value from the selected Input which has sap.m.select Control
		 * @public
		 */
		_getSelectValue: function (sId, sFName, aSelectedTokens) {
			var sValue = this.getView().byId(sId).getSelectedKey();
			if(sValue !== ""){
				aSelectedTokens.push({
					"Fname": sFName,
					"Option": "EQ",
					"Sign": "I",
					"Low": sValue,
					"High": ""
				});
			}
			return aSelectedTokens;
		},

		/**
		 * Method to check multiple items exists in From input field
		 * @private
		 */
		_checkMulultipleItems: function (id, sSrcId, sToId) {
			var object, numTokens;
			var mulFlag = false;
			if (id === sToId) {
				object = this.getView().byId(id);
				numTokens = this.getView().byId(sSrcId).getTokens().length;
				mulFlag = this._changeValueState(object, numTokens);
			}
			return mulFlag;
		},

		/**
		 * Method to change the value state based on the multiple tokens
		 * @priavte
		 */
		_changeValueState: function (object, numTokens) {
			if (numTokens > 1) {
				object.setValue("");
				object.removeAllTokens();
				MessageToast.show(this._geti18nText("multipleEntriesError"));
				$(".sapMMessageToast").css("background-color", "red");
				return true;
			} else {
				object.setValueState("None");
				return false;
			}
		},

		
		/**
		 * Method to get the selected fields for extraction 
		 * @priavte
		 */
		fillOutputFields: function (aOutputList) {
			var aOutputList = [];
			var aAllFieldList = sap.ui.getCore().getModel("ExtractionGlobalJSONModel").getData().aFieldListSet;
			var aSelectedFieldList = sap.ui.getCore().getModel("ExtractionGlobalJSONModel").getData().aSelectedFieldListSet;
			if (!aSelectedFieldList) {
				aSelectedFieldList = aAllFieldList;
			}
			for (var i = 0; i < aSelectedFieldList.length; i++) {
				aOutputList.push({
					Fname: aSelectedFieldList[i].Fname,
					Zdesc: aSelectedFieldList[i].Desc
				});
			}
			return aOutputList;
		},

		/**
		 * Method to clear the data stored in model from file for perticular field
		 * @priavte
		 */
		_clearJsonData: function (sModel, sFieldName) {
			var sProperty = "/" + sFieldName;
			this.getView().getModel(sModel).setProperty(sProperty, []);
		},

		/**
		 * File Upload Event
		 * Method triggers whenever user uploads a file other than filetypes mentioned.
		 * currently it is xlsx. Method shows a error message.
		 * @public
		 */
		onTypeMismatch: function (oEvent) {
			var aFileTypes = oEvent.getSource().getFileType();
			jQuery.each(aFileTypes, function (key, value) {
				aFileTypes[key] = "*." + value;
			});
			var sFileType = oEvent.getParameters().getParameter("fileType");
			var sSupportedFileTypes = aFileTypes.join(", ");
			MessageToast.show(this.getResourceBundle().getText("fileTypeMismatch", [sFileType, sSupportedFileTypes]));
			$(".sapMMessageToast").css("background-color", "red");
		},

		/**
		 * File Upload Fragment.
		 * Method to open a File Upload fragment.
		 * @private
		 */
		_onFileUpload: function (oEvent) {
			if (!this._fileUpload) {
				this._fileUpload = sap.ui.xmlfragment(
					"bosch.ma.Extractor.fragment.FileUpload",
					this
				);
				this.getView().addDependent(this._fileUpload);
			}
			this._fileUpload.open();
		},

		/**
		 * File Upload Fragment.
		 * Method to get data from the file uploaded.
		 * @private
		 */
		_importFile: function (sModel, file, fName) {
			var that = this;
			if (file && window.FileReader) {
				var reader = new FileReader();
				var data;
				var aFileContent;
				reader.onload = function (e) {
					data = e.target.result;
					var wb = XLSX.read(data, {
						type: 'binary'
					});
					wb.SheetNames.forEach(function (sheetName) {
						aFileContent = XLSX.utils.sheet_to_row_object_array(wb.Sheets[sheetName]);
						if (aFileContent.length > 0) {
							that._validateInsertData(sModel, aFileContent, fName);
						}
					});
				};
				reader.onloadend = function (e) {
					// that._disableField(fName, oSelJSONModel, that);
				};
				if (file.name.includes(".xlsx")) {
					reader.readAsBinaryString(file);
				} else {
					Papa.parse(file, {
						complete: function (results) {
							that._validateInsertData(sModel, results.data, fName);
						}
					});
				}
			}
		},

		/**
		 * File Upload Fragment.
		 * Method to validate the data fetched from the excel file.
		 * @private
		 */
		_validateInsertData: function (sModel, fileContent, fName) {
			var firstColumn = Object.keys(fileContent[0])[0];
			var aUploadData = [];
			for (var i = 0; i < fileContent.length; i++) {
				aUploadData.push({
					"Fname": fName,
					"Option": "EQ",
					"Sign": "I",
					"Low": fileContent[i][firstColumn],
					"High": ""
				});
			}
			if (aUploadData.length > 0) {
				this.getView().getModel(sModel).setProperty("/" + fName, aUploadData);
			}
		},

		/**
		 * File Upload Fragment
		 * Method triggers whenever user presses download template button.
		 * Excel File will be downloaded with column name and without any data.
		 * @public
		 */
		onDownloadTemplate: function (oEvent) {
			if (this.sUploadOpt) {
				var sColumn = this.sUploadOpt;
			} else {
				sColumn = '';
			}
			var sFileName = sColumn + "Template";
			var oTemplateModel = new sap.ui.model.json.JSONModel();
			oTemplateModel.setData([]);
			var oExport = new Export({
				exportType: new ExportTypeCSV({
					fileExtension: "csv",
					separatorChar: ","
				}),
				models: oTemplateModel,
				rows: {
					path: "/"
				},
				columns: (function () {
					var newColumn = [{
						name: sColumn,
						template: {
							content: ''
						}
					}];
					return newColumn;
				})()
			});
			oExport.saveFile(sFileName).catch(function (oError) {}).then(function () {
				oExport.destroy();
			});
			MessageToast.show(this._geti18nText("templateFillingMessage"));
			$(".sapMMessageToast").css("background-color", "green");
		},

		/**
		 * Load data from local model outputList.json for output list
		 * @private
		 */
		_setOutputList: function (sView) {
			var oModel = new JSONModel();
			oModel.loadData("model/outputList.json");
			this.getView().setModel(oModel, "outputList");
			var that = this;
			oModel.attachRequestCompleted(function () {
				// set the first item(/0/) in output list as a default selected key
				var sProperty = "/outputLists/" + sView + "/0/VienrMa/";
				var sViewId = that.getView().getModel("outputList").getProperty(sProperty);
				that.getView().byId("__outList").setSelectedKey(sViewId);
			});
		},

		/**
		 * get all fields for a output list item from metadata
		 * 
		 */
		_getOutputFieldList: function (sView) {
			var aFieldList = [];
			var sProperty = "/outputLists/" + sView;
			var aOutputList = this.getView().getModel("outputList").getProperty(sProperty);
			var sOutListSelKey = this.getView().byId("__outList").getSelectedKey();
			if (sOutListSelKey !== this.selectedOutputList) {
				var oSelectedListDetail = aOutputList.find(j => j['VienrMa'] === sOutListSelKey);
			 if(this._oUpdateODataModel.getServiceMetadata()){
				var aEntityTypeArray = this._oUpdateODataModel.getServiceMetadata().dataServices.schema[0].entityType;
				var aEntityProperty = aEntityTypeArray.find(j => j['name'] === oSelectedListDetail.ViewInt).property;
				this.selectedOutputList = sOutListSelKey; // used for further internal  purpose
				 for (var i = 0; i < aEntityProperty.length; i++) {
					var oProperty = aEntityProperty[i].extensions.find(j => j['name'] === "label");
					if (aEntityProperty[i].name.startsWith("Rule") === false && aEntityProperty[i].name.startsWith("RB_Group") === false) { // don't consider the field which start with "Rule" or "Group" as output field
							aFieldList.push({
								FnameC: aEntityProperty[i].name.toUpperCase(),
								Fname: aEntityProperty[i].name,
								Desc: oProperty.value,
							});						
					}
					this.getView().getModel("ExtractionGlobalJSONModel").setProperty("/aFieldListSet", aFieldList);
					sap.ui.getCore().setModel(this.getView().getModel("ExtractionGlobalJSONModel"), "ExtractionGlobalJSONModel");					
				 }
				}else{
					// show metedata not loaded....
				}
				this._clearPreviouslySelectedItems();
			}
		},

		/**
		 * Method will be triggered whenever user presses ok or close in value help .
		 * This method will set selected items as tokens 
		 * @public
		 */
		_handleValueHelpClose: function (evt) {
			if (evt.getId() !== "cancel") {
				var oSelectedContexts = evt.getParameter("selectedContexts");
				var aTokens = [];
				for (var i = 0; i < oSelectedContexts.length; i++) {
					var oModel = oSelectedContexts[i].getModel();
					var sPath = oSelectedContexts[i].getPath();
					var oData = oModel.getProperty(sPath);
					var aKeys = Object.keys(oData);
					var sKey = aKeys[1];
					var sValue = oData[sKey];
					aTokens.push(new sap.m.Token({
						key: sValue,
						text: sValue
					}));
				}
				this.byId(this.inputId).setTokens(aTokens);
			}
		},

		/**
		 * Method to Form a value help dialog and Open.
		 * @private
		 */
		_formValueHelp: function (sInputType, bFragExist, oFragId, sPath, sFPath1, sFPath2, sText1, sText2) {
			if (bFragExist === false) {
				this.getView().addDependent(oFragId);
				oFragId.bindItems({
					path: sPath,
					   parameters: {
						      operationMode: sap.ui.model.odata.OperationMode.Server
						   },
					template: new sap.m.ColumnListItem({
						cells: [
							new sap.m.Text({
								text: sFPath1
							}),
							new sap.m.Text({
								text: sFPath2
							})
						]
					})
				});
				oFragId.addColumn(new sap.m.Column({
					header: new sap.m.Label({
						text: sText1
					})
				}));
				oFragId.addColumn(new sap.m.Column({
					header: new sap.m.Label({
						text: sText2
					})
				}));
			}

			var aAggregation = this.byId(this.inputId).getParent().getAggregation('content');
			if (aAggregation.length > 0) {
				var sFrmId = aAggregation[0].getId();
				var sToId = aAggregation[1].getId();
			}
			if (this.inputId === sToId) {
				oFragId.setMultiSelect(false);
			} else {
				var aTokensTo = this.byId(sToId).getTokens();
				if (aTokensTo.length > 0) {
					oFragId.setMultiSelect(false);
				} else {
					oFragId.setMultiSelect(true);
				}
			}
			oFragId.setRememberSelections(true);
			oFragId.open();
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Method to call the back-end to download the excel and extract online.
		 * @private
		 */
		extractOnline: function(oEntry, sFileName, sMaterialDuplicateCheck) {
		    var that = this;
		    var dialog = new sap.m.Dialog({
		        title: that._geti18nText("dialogTitle"),
		        type: sap.m.DialogType.Message,
		        content: new sap.m.Text({
		            text: that._geti18nText("dialogText")
		        }),
		        beginButton: new sap.m.Button({
		            text: that._geti18nText("dialogProceed"),
		            press: function() {
		                that.setBusyDialog();
		                that._oUpdateODataModel.create("/ObjectMigSet", oEntry, {
		                    success: function(data) {
		                        that.destroyBusyDialog();
		                        var oExcelJsonModel = new sap.ui.model.json.JSONModel();
		                        var keyList = Object.keys(data);
		                        var ldata;
		                        var viewVal;
		                        for (var i = 0; i < keyList.length; i++) {
		                            ldata = keyList[i].toUpperCase();
		                            if (data.Value === ldata) {
		                                viewVal = keyList[i];
		                            }
		                        }
		                        if (data[viewVal]) {
		                            var list = data[viewVal].results;
		                            if (list.length) {
		                                if (list.length > 0) {
		                                    var entityTypeName = viewVal.split("_")[1];
		                                    var propertyList = [];
		                                    var entityTypeArray = that._oUpdateODataModel.getServiceMetadata().dataServices.schema[0].entityType;
		                                    for (var i = 0; i < entityTypeArray.length; i++) {
		                                        if (entityTypeArray[i].name === entityTypeName) {
		                                            propertyList = entityTypeArray[i].property;
		                                            break;
		                                        }
		                                    }
		                                    oExcelJsonModel.setData(list);
		                                    var oExport = new Export({
		                                        exportType: new ExportTypeCSV({
		                                            fileExtension: "csv",
		                                            separatorChar: ","
		                                        }),
		                                        models: oExcelJsonModel,
		                                        rows: {
		                                            path: "/"
		                                        },
		                                        columns: (function() {
		                                            var newColumn = [];
		                                            var extList = [];
		                                            var keyDesc;
		                                            var sRIndex = 0;
		                                            var aRulesList = sap.ui.getCore().getModel("ExtractionGlobalJSONModel").getData().aRuleSet;
		                                            var aAllFieldList = sap.ui.getCore().getModel("ExtractionGlobalJSONModel").getData().aFieldListSet;
		                                            var aSelectedFieldList = sap.ui.getCore().getModel("ExtractionGlobalJSONModel").getData().aSelectedFieldListSet;
		                                            if (!aSelectedFieldList) {
		                                                aSelectedFieldList = aAllFieldList;
		                                            }
		                                            for (var key in list[0]) {
		                                                if (key !== '__metadata') {
		                                                    if (key.startsWith("Rule") === true) {
		                                                        var oCurrRule = aRulesList[sRIndex];
		                                                        if (!oCurrRule) {
		                                                            break;
		                                                        }
		                                                        sRIndex = sRIndex + 1;
		                                                        keyDesc = "Rule - " + oCurrRule.RuDesc + " [" + oCurrRule.RuId.toUpperCase() + "]";
		                                                        var obj = {
		                                                            name: keyDesc,
		                                                            template: {
		                                                                content: '{' + key + '}'
		                                                            }
		                                                        };
		                                                        newColumn.push(obj);
		                                                    } else if (key.startsWith("RB_Group") === true) {
		                                                        if (sMaterialDuplicateCheck) {
		                                                            for (var ind in propertyList) {
		                                                                if (propertyList[ind].name === key) {
		                                                                    extList = propertyList[ind].extensions;
		                                                                    for (var val in extList) {
		                                                                        if (extList[val].name === "label") {
		                                                                            keyDesc = extList[val].value;
		                                                                            break;
		                                                                        }
		                                                                    }
		                                                                    break;
		                                                                }
		                                                            }
		                                                            var obj = {
		                                                                name: keyDesc + " [" + key.toUpperCase() + "]",
		                                                                template: {
		                                                                    content: '{' + key + '}'
		                                                                }
		                                                            };
		                                                            newColumn.push(obj);
		                                                        }
		                                                    } else {
		                                                        var bFieldExist = aSelectedFieldList.some(aSelectedFieldList => aSelectedFieldList['Fname'] === key);
		                                                        if (bFieldExist === true) {
		                                                            for (var ind in propertyList) {
		                                                                if (propertyList[ind].name === key) {
		                                                                    extList = propertyList[ind].extensions;
		                                                                    for (var val in extList) {
		                                                                        if (extList[val].name === "label") {
		                                                                            keyDesc = extList[val].value;
		                                                                            break;
		                                                                        }
		                                                                    }
		                                                                    break;
		                                                                }
		                                                            }
		                                                            var obj = {
		                                                                name: keyDesc + " [" + key.toUpperCase() + "]",
		                                                                template: {
		                                                                    content: '{' + key + '}'
		                                                                }
		                                                            };
		                                                            newColumn.push(obj);
		                                                        }
		                                                    }
		                                                }
		                                            }
		                                            return newColumn;
		                                        })()
		                                    });
		                                    oExport.saveFile(sFileName).catch(function(oError) {}).then(function() {
		                                        oExport.destroy();
		                                    });
		                                    MessageToast.show(that._geti18nText("fileDownloadSuccess"));
		                                    $(".sapMMessageToast").css("background-color", "green");
		                                } else {
		                                    sap.m.MessageBox.error(that._geti18nText("noDataFound"));
		                                    $(".sapMMessageToast").css("background-color", "red");
		                                }
		                            } else {
		                                sap.m.MessageBox.error(that._geti18nText("noDataFound"));
		                                $(".sapMMessageToast").css("background-color", "red");
		                            }
		                        } else {
		                            sap.m.MessageBox.error(that._geti18nText("noDataFound"));
		                            $(".sapMMessageToast").css("background-color", "red");
		                        }

		                    },
		                    error: function(error) {
		                        that.destroyBusyDialog();
		                        // handler function for all error status is written in base controller
		                        that.handleErrorLog(error);
		                    }
		                });
		                dialog.close();
		            }
		        }),
		        endButton: new sap.m.Button({
		            text: that._geti18nText("dialogClose"),
		            press: function() {
		                dialog.close();
		            }
		        }),
		        afterClose: function() {
		            dialog.destroy();
		        }
		    });
		    dialog.open();
		},

		/**
		 * Method to call the back-end to start the background job.
		 * And navigate to the job monitoring app 
		 * @private
		 */
		backgroundJobStart: function (oEntry) {
			var that = this;
			this.setBusyDialog();
			this._oUpdateODataModel.create(
				"/BatchJobSet", oEntry, {
					success: function (oData) {
						that.destroyBusyDialog();
						var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
						var sSysIP = window.location.origin;
						var sURL = "/sap/bc/ui5_ui5/sap/zrb_ui_job_moni/index.html";
						var sClientNo = new URLSearchParams(window.location.search).get("sap-client");
						if (sClientNo) {
							var sClientPara = "?sap-client=" + sClientNo;
							var sRExtURL = sSysIP + sURL + sClientPara;
						} else {
							sRExtURL = sSysIP + sURL;
						}
						var sURL = sRExtURL+ "&batch=" + oData.Batchid +
							"#/detail/job/" + oData.Batchid;
						if (oData.Batchid !== "") {
							MessageBox.show('Job Id ', {
								icon: MessageBox.Icon.SUCCESS,
								title: that._geti18nText("successfulJobSchedule"),
								actions: [sap.m.MessageBox.Action.CLOSE],
								styleClass: bCompact ? "sapUiSizeCompact" : "",
								contentWidth: "100px"
							});
							jQuery('.sapMDialogSection .sapMDialogScrollCont').append(' <a href="' + sURL + '" target="_blank">' + oData.Batchid +
								'</a>' +
								' has been created.');
						} else {
							MessageBox.show(that._geti18nText("errorJobSchedule"), {
								icon: MessageBox.Icon.ERROR,
								title: that._geti18nText("JobError"),
								actions: [sap.m.MessageBox.Action.CLOSE],
								styleClass: bCompact ? "sapUiSizeCompact" : "",
								contentWidth: "100px"
							});
						}
					},
					error: function (error) {
						that.destroyBusyDialog();
						that.handleErrorLog(error);
					}
				});
		},

		/**
		 * OutputField Customization Fragment
		 * Method will be triggered whenever the user presses close or Ok.
		 * Below method is used to get the selected fields
		 */
		onPressOutputListAction: function (oEvent) {
			if (oEvent.getId() !== "cancel") {
				var aContexts = oEvent.getParameter("selectedItems");
				var aSelectedFieldList = [];
				for (var i = 0; i < aContexts.length; i++) {
					aSelectedFieldList.push({
						Fname: aContexts[i].getBindingContext("ExtractionGlobalJSONModel").getObject("Fname"),
						Desc: aContexts[i].getBindingContext("ExtractionGlobalJSONModel").getObject("Desc")
					});
				}
				this.getView().getModel("ExtractionGlobalJSONModel").setProperty("/aSelectedFieldListSet", aSelectedFieldList);
				sap.ui.getCore().setModel(this.getView().getModel("ExtractionGlobalJSONModel"), "ExtractionGlobalJSONModel");
			}
		},

		_getData: function (sModel, sEntitySet, sPropertyName) {
			var that = this;
			var oValueHelpModel = this.getView().getModel(sModel);
			var sPath = "/" + sEntitySet + "";
			var sProperty = "/" + sPropertyName + "";
			this._oUpdateODataModel.read(sPath, {
				success: function (data) {
					oValueHelpModel.setProperty(sProperty, data.results);
				},
				error: function (error) {
					that.handleErrorLog(error);
				}
			});
		},

		/**
		 * Below Method is used on change event of multiinput
		 * It will form a tokens and checks for the entries which exists in 
		 * suggestion items
		 */
		_onSelectchange: function (oEvent) {
			// No suggestion so commented below code
			var enteredValue = oEvent.getParameters().value;
			var customId = oEvent.getSource().data("inpId");
			var object = this.getView().byId(customId);
			var oBinding = object.getBinding("suggestionItems");
			var aAggregation = object.getAggregation("suggestionItems");
			var bExist = false;
			var bInSuggest = false;
			if (oBinding && aAggregation.length > 0) {
				var oModel = oBinding.getModel();
				var sPath = oBinding.getPath();
				var aTotalItems = oModel.getProperty(sPath);
				var oKey = aAggregation[0].getBindingInfo("key");
				var sKey = oKey.binding.getPath();
				var aExistingTokens = object.getTokens();
				for (var i = 0; i < aExistingTokens.length; i++) {
					var sKey = aExistingTokens[i].getProperty('key');
					if (sKey === enteredValue) {
						bExist = true;
					}
				}
				bInSuggest = aTotalItems.some(aTotalItems => aTotalItems[sKey] === enteredValue);
			}
			if (bExist) {
				MessageToast.show(this._geti18nText("tokenExistMsg"));
				$(".sapMMessageToast").css("background-color", "yellow");
				$(".sapMMessageToast").css("color", "black");
				object.setValue("");
				return;
			}
			if (bInSuggest) {
				var oToken = new sap.m.Token({
					key: enteredValue.toUpperCase(),
					text: enteredValue.toUpperCase()
				});
				var aTokens = object.getTokens();
				aTokens.push(oToken);
				object.setTokens(aTokens);
			} 
			/*else {
				MessageToast.show(this._geti18nText("suggestionItemError"));
				$(".sapMMessageToast").css("background-color", "red");
			}
			object.setValue("");*/
		},

		/**
		 * Event handler for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				// Otherwise we go backwards with a forward history
				var bReplace = true;
				this.getRouter().navTo("master", {}, bReplace);
			}
		},

		/**
		 * Below method will form the message and action based on the error response from the backend.
		 * @private
		 * @params {oErrorLog} - Error response from backend
		 */
		handleErrorLog: function (oErrorLog) {
			var sMessage;
			var aActions = [this._geti18nText("btnClose")];
			switch (oErrorLog.statusCode.toString()) {
			case "400":
				var oErrJSON = JSON.parse(oErrorLog.responseText);
				sMessage = oErrJSON.error.message.value;
				break;
			case "401":
				sMessage = this._geti18nText("Unauthorize");
				break;
			case "403":
				sMessage = this._geti18nText("ExpiredSession") + "\n" + this._geti18nText("PressOkRestart");
				aActions = [this._geti18nText("Okay")];
				break;
			case "404":
				sMessage = this._geti18nText("NotFoundTryAgain");
				break;
			case "500":
				sMessage = this._geti18nText("TechnicalError");
				break;
			default:
				sMessage = this._geti18nText("TechnicalErrorContactAdmin");
				break;
			}
			this.errMsgBox(aActions, sMessage);
		},

		/**
		 * Below method will show the error message.
		 * @private
		 * @params {aActions} - Actions for the MesssageBox
		 * @params {sMessage} - Message to be displayed
		 */
		errMsgBox: function (aActions, sMessage) {
			var that = this;
			var sTitleMsg = this._geti18nText("warning_E");
			sap.m.MessageBox.show(sMessage, {
				icon: sap.m.MessageBox.Icon.ERROR,
				title: sTitleMsg,
				actions: aActions,
				defaultAction: "CLOSE",
				styleClass: "sapUiSizeCompact",
				onClose: function (sAction) {
					if (sAction === that._geti18nText("Okay")) {
						location.reload(); //eslint-disable-line
					}
				}
			});
		},
		
		_clearPreviouslySelectedItems: function() {
			if (this._oFieldSelectionDialog) {
				var aItems = this._oFieldSelectionDialog.getItems();
				for (var i = 0; i < aItems.length; i++) {
					if (aItems[i].isSelected()) {
						aItems[i].setSelected(false);
					}
				}
			}
		},

		/**
		 * Below method will get the i18n text.
		 * @private
		 * @params {langKey} - i18n text key
		 * @return- value mentioned in i18n
		 */
		_geti18nText: function (langKey) {
			var sContent = this.getResourceBundle().getText(langKey);
			return sContent;
		},

		/**
		 * Below method is to set date fields default as current Date 
		 */
		_setDefaultDate: function (id) {
			this.getView().byId(id).setDateValue(new Date());
		},
		
		_onIncludeSelected: function(oEvt){
			var bSelected = oEvt.getParameters().selected;
			if(bSelected === true){
				this.getView().byId('sForm').setVisible(true);
			}
			else{
				this.getView().byId('sForm').setVisible(false);
			}
		},
			
		_onCleasingIncludeSelected: function(oEvt){
			var bSelected = oEvt.getParameters().selected;
			if(bSelected === true){
				var oCleansingCombobox = this.getView().byId('CleansingCombobox');
				oCleansingCombobox.setSelectedItems ( oCleansingCombobox.getItems() );				
				this.getView().byId('CleansingForm').setVisible(true);
			}
			else{
				this.getView().byId('CleansingForm').setVisible(false);
			}
		},
		
		getCleansingViewList: function(){
			var aViewList = [];
			var oCleansingCombobox = this.getView().byId('CleansingCombobox');
			var aComboboxList = oCleansingCombobox.getSelectedItems();
			for (var i = 0; i < aComboboxList.length; i++) {
				aViewList.push({
					Viewkey: aComboboxList[i].getKey(),
					Viewtext:aComboboxList[i].getText()
				});
			}
			return aViewList;
		}
	});

});
