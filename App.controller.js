sap.ui.define([
	"bosch/ma/Extractor/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";
	return BaseController.extend("bosch.ma.Extractor.controller.App", {
		/**
		 * Controller life cycle event. This event will be called only once the view is created 
		 * @public
		 */
		onInit: function () {
			this.setBusyDialog();
			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			
		}
	});
});
