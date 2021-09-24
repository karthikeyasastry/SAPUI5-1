sap.ui.define([
	"bosch/ma/Extractor/controller/BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"bosch/ma/Extractor/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/ui/unified/Calendar"
], function (BaseController, History, JSONModel, formatter, Filter, FilterOperator, MessageBox) {
	"use strict";
	return BaseController.extend("bosch.ma.Extractor.controller.ExtractAssetBalance", {

		formatter: formatter,
		oJsonModel: {},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		/**
		 * Controller life cycle event. This event will be called only once the view is created 
		 * @public
		 */
		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);
			this.sUploadOpt = null;
			this.getView().setModel(this._oUpdateODataModel);
			this.getView().setModel(new JSONModel(), "ExtractAssetBalanceJSON");
			this.getRouter().getRoute("extractAssetBalance").attachPatternMatched(this._onObjectMatched, this);
			this.destroyBusyDialog();
		},

		/**
		 * Below Method is triggered the router pattern matched
		 * This is used to get the master details for project, module, Migration Object & Active Rules 
		 * @public
		 */
		_onObjectMatched: function (oEvent) {
			// get Project, Module, Migration object & version from the routing URL
			this.sPrjId = oEvent.getParameters().arguments.PRJ_ID;
			this.sModId = oEvent.getParameters().arguments.MO_ID;
			this.sMigObjId = oEvent.getParameters().arguments.MIG_OBJ;
			this.sVersion = oEvent.getParameters().arguments.VERSION;
			this.getMasterDetails(this.sPrjId, this.sModId, this.sMigObjId, this.sVersion); // Implemented in base controller
			this.selectedOutputList = "";
			this._setOutputList("AssetBalance"); // implemented in Base Controller
		},


		/**
		 * below function is triggered from the view; when a user changes the output list item
		 * @public
		 */
		_onOutputListChange: function () {
			this._getOutputFieldList("AssetBalance"); // implemented in Base Controller
		},

		/**
		 * below function is triggered from the view; when a user clicks 'Customize Output List' Button
		 * This shows all fields for the selected output list item
		 */
		_onPressFieldList: function (oEvent) {
			if (!this._oFieldSelectionDialog) {
				this._oFieldSelectionDialog = sap.ui.xmlfragment("bosch.ma.Extractor.fragment.OutputFieldCustomization", this);
				this.getView().addDependent(this._oFieldSelectionDialog);
			}
			this._getOutputFieldList("AssetBalance"); // implemented in Base Controller
			this._oFieldSelectionDialog.open();
		},

		/**
		 * Event Handler
		 * Below method is used to validate the data entered in input 
		 * @public
		 */
		_onFieldChange: function (oEvent) {
			var enteredValue = oEvent.getParameters().value,
				sId = oEvent.getSource().getId();
			if (oEvent.getSource().getParent().getAggregation("content")[1]) {
				var sSrcId = oEvent.getSource().getParent().getAggregation("content")[0].getId();
				var sToId = oEvent.getSource().getParent().getAggregation("content")[1].getId();
			}
			this._checkMulultipleItems(sId, sSrcId, sToId); // Implemented In Base Controller
		},

		/**
		 * Event Handler
		 * Below method is triggered whenever the user presses upload button
		 * in material
		 * @public
		 */
		_onAssetUpload: function (oEvent) {
			this.sUploadOpt = "ANLN1";
			this._onFileUpload(); // Implemented In Base COntroller
		},

		/**
		 * Event Handler
		 * Below method is triggered whenever the user presses value help
		 * @public
		 */
		_onHandleValueHelp: function (oEvent) {
			var mulFlag = false;
			this.inputId = oEvent.getSource().getId();
			if (oEvent.getSource().getParent().getAggregation("content")[1]) {
				var sSrcId = oEvent.getSource().getParent().getAggregation("content")[0].getId();
				var sToId = oEvent.getSource().getParent().getAggregation("content")[1].getId();
			}
			var sInputType = oEvent.getSource().data("inpId");
			mulFlag = this._checkMulultipleItems(this.inputId, sSrcId, sToId);
			var bFragExist;
			if (!mulFlag) {
				if (sInputType === "CompCodeFrom" || sInputType === "CompCodeTo") {
					if (!this._valueHelpDialogCompCode) {
						this._valueHelpDialogCompCode = sap.ui.xmlfragment(
							"bosch.ma.Extractor.fragment.Dialog",
							this
						);
						bFragExist = false;
					} else {
						bFragExist = true;
					}
					this._formValueHelp(sInputType, bFragExist, this._valueHelpDialogCompCode, "/F4CompanyCodeSet",
						"{Bukrs}",
						"{Butxt}",
						this._geti18nText("ExtractAssetBalance.CompanyCode"), this._geti18nText("ExtractAssetBalance.Description")); // Implemented in Base Controller
				}

				if (sInputType === "assetFrom" || sInputType === "assetTo") {
					if (!this._valueHelpDialogAsset) {
						this._valueHelpDialogAsset = sap.ui.xmlfragment(
							"bosch.ma.Extractor.fragment.Dialog",
							this
						);
						bFragExist = false;
					} else {
						bFragExist = true;
					}
					this._valueHelpDialogAsset.setGrowing(true);
					this._formValueHelp(sInputType, bFragExist, this._valueHelpDialogAsset, "/F4AssetSet",
						"{Anln1}",
						"{Anlhtxt}",
						this._geti18nText("ExtractAssetBalance.Asset"), this._geti18nText("ExtractAssetBalance.Description"));
				}
			}
		},

		/**
		 * Event handler
		 * Below Method is triggered serach in value help
		 * Items will be filterd based on values in oPathFilter
		 * @public
		 */
		_handleValueHelpSearch: function (oEvt) {
			var sValue = oEvt.getParameter("value");
			var oItemBinding = oEvt.getParameter("itemsBinding");
			var oPathFilter = {
				 F4CompanyCodeSet: ["Bukrs", "Butxt"],
				 F4AssetSet: ["Anln1", "Anlhtxt"]
			};
			var sFilterField = oPathFilter[oItemBinding.getPath().slice(1)];
			var aFilter = [];
			if (sFilterField.length) { // if the value help needs list of fields in search
				aFilter.push(new Filter(sFilterField[0], FilterOperator.Contains, sValue));
				aFilter.push(new Filter(sFilterField[1], FilterOperator.Contains, sValue));
			} else { // if the value help needs only one field in search
				aFilter.push(new Filter(sFilterField, FilterOperator.Contains, sValue));
			}
			oEvt.getSource().getBinding("items").filter(new Filter(aFilter), false)
		},

		/**
		 * Event handler
		 * Below Method is triggered whenever file upload happens 
		 * data will be stored in JSON local model
		 * @public
		 */
		onChange: function (oEvent) {
			var sFileName = oEvent.getParameter("files")[0];
			if (this.sUploadOpt === "ANLN1") {
				this._importFile("ExtractAssetBalanceJSON", sFileName, this.sUploadOpt); // implemented in Base Controller
			}
		},

		/**
		 * Event handler
		 * Below Method is triggered whenever close button is pressed in file upload dialog
		 * @public
		 */
		onCloseFileUpload: function (oEvent) {
			this._fileUpload.close();
		},

		/**
		 * Event handler
		 * Below Method is triggered after file upload dialog closed
		 * @public
		 */
		_afterFileUploadClose: function (oEvent) {
			var aFiles = oEvent.getSource().getAggregation("content")[0].getItems();
			if (aFiles.length === 0) {
				if (this.sUploadOpt === "ANLN1") {
					this._clearJsonData("ExtractAssetBalanceJSON", "ANLN1"); //implemented in Base Controller
				}
			}
		},

		/**
		 * Event handler
		 * Below Method is triggered whenever close button is pressed in output field customization dialog 
		 * @public
		 */
		onPressClose: function () {
			this._oFieldSelectionDialog.close();
		},

		/**
		 * Event handler
		 * Below Method is triggered whenever Delete button is pressed in file upload dialog 
		 * @public
		 */
		onFileDeleted: function (oEvent) {
			if (this.sUploadOpt === "ANLN1") {
				this._clearJsonData("ExtractAssetBalanceJSON", "ANLN1"); //implemented in Base Controller
			}
		},

		/**
		 * Event handler
		 * Below Method is triggered whenever the refresh button is pressed in rule table 
		 * @public
		 */
		_onRefreshPress: function (oEvt) {
			this.getActiveRules(this.sPrjId, this.sModId, this.sMigObjId, this.sVersion, this, "aRuleSet"); // implemented in Base Controller
		},

		/**
		 * Below Method is triggered whenever the user presses the Extract Data Online Button
		 * Method is used to extract Data in online mode
		 * @public
		 */
		_onExtractionOnline: function () {
			var oEntry = {};
			var aSelectedItems = this._getSelectionScreenInputs();
			var oEntry = {
				"ObjectMig_AssetBalance": [{}]
			};

			var bResult = this._ValidateInputs(aSelectedItems);
			if (bResult === true) {
				var sOutList = this.getView().byId("__outList").getSelectedKey();
			} else {
				return;
			}

			var that = this;
			var sFileName = sOutList;
			oEntry.Viewname = sOutList;
			oEntry.ObjectMigImport = aSelectedItems;
			oEntry.PjId = this.sPrjId;
			oEntry.MoId = this.sModId;
			oEntry.MiObId = this.sMigObjId;
			oEntry.Version = this.sVersion;

			this._getOutputFieldList("AssetBalance"); // implemented in Base Controller			
			this.extractOnline(oEntry, sFileName); // implemented in Base Controller
		},

		/**
		 * Below Method is triggered whenever the user presses the Extract Background Button
		 * Popup will be opened to enter the description and Job start can be done
		 * @public
		 */
		_onExtractionBackground: function () {
			if (!this._oDialog) {
				if (sap.ui.getCore().byId("idModNew")) {
					sap.ui.getCore().byId("idModNew").destroy();
				}
				this._oDialog = sap.ui.xmlfragment(
					"bosch.ma.Extractor.fragment.JobDescriptionDialog",
					this);
			}
			var aSelectedItems = this._getSelectionScreenInputs();
			var bSuccess = this._ValidateInputs(aSelectedItems);
			if (bSuccess) {
				var acurrDate = new Date().toISOString().substring(0, 10).split("-");
				var oTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
					pattern: "KK:mm:ss a"
				});
				var sTime = oTimeFormat.format(new Date());
				var BatchDesc = this.sMigObjId + "_" + acurrDate[0] + "-" + acurrDate[1] + "-" + acurrDate[2] + "_" + sTime;
				sap.ui.getCore().byId("idModNew").setValue(BatchDesc);
				this.getView().addDependent(this._oDialog);
				this._oDialog.open();
			}
		},

		/**
		 * Below Method is triggered whenever the user presses Start Job Button in Extract Backgound mode pop-up
		 * This will schedule a job in background
		 * @public
		 */
		onStartJob: function () {
			this._oDialog.close();
			var aSelectedItems = [];
			aSelectedItems = this._getSelectionScreenInputs();
			var oEntry = {};
			var that = this;
			var sOutList = this.getView().byId("__outList").getSelectedKey();
			var sFileName = sOutList;
			oEntry.Viewname = sOutList;
			oEntry.N_Import = aSelectedItems;
			oEntry.PjId = this.sPrjId;
			oEntry.MoId = this.sModId;
			oEntry.MiObId = this.sMigObjId;
			oEntry.Version = this.sVersion;
			this._getOutputFieldList("AssetBalance"); // implemented in Base Controller	
			oEntry.N_OutputFields = this.fillOutputFields();
			oEntry.Desc = sap.ui.getCore().byId("idModNew").getValue();
					
			this.backgroundJobStart(oEntry); // implemented in Base Controller
		},

		/**
		 * Below method is triggered whenever the user presses cancel Button in Extract Backgound mode pop-up
		 * @private
		 */
		onCancel: function () {
			this._oDialog.close();
		},

		/**
		 * Below method is used to form the data from input selection 
		 * @private
		 */
		_getSelectionScreenInputs: function () {
			var aSelectedTokens = [];
			//Get data from input fields
			this.fillTokenValue("CompCodeFrom", "CompCodeTo", "BUKRS", false, aSelectedTokens); // implemented in Base Controller
			this.fillTokenValue("assetFrom", "assetTo", "ANLN1", false, aSelectedTokens);
			this.fillTokenValue("subNumberFrom", "subNumberTo", "ANLN2", false, aSelectedTokens);
			this.fillTokenValue("fiscalYearFrom", "fiscalYearTo", "GJAHR", false, aSelectedTokens);
			//Get Data from Uploaded Excel File 
			this._fillExcelValue("ExtractAssetBalanceJSON", "ANLN1", aSelectedTokens); // Implemented In Base Controller
			return aSelectedTokens;
		},

		/**
		 * Below method is used to check the mandatory fields
		 * before extracting online
		 * @private
		 * @params {aSelectedItems} - Selected Data
		 * @returns {bResult} - Validation success or not
		 */
		_ValidateInputs: function (aSelectedItems) {
			var bResult = true;
			var bBukrs = aSelectedItems.some(aSelectedItems => aSelectedItems['Fname'] === 'BUKRS');
			if (bBukrs === false) {
				sap.m.MessageBox.error(this._geti18nText("ExtractAssetBalance.CompCodeMandatory"));
				bResult = false;
			}
			return bResult;
		},

	});
});
