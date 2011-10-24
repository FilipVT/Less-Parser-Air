var appUpdater = new runtime.air.update.ApplicationUpdaterUI();

$(document).ready(function() { 
	// check application version
	
	
	// ApplicationUpdaterUI can be configured via a configuration file 
	// delivered with the application or via JavaScript in the application.
	appUpdater.configurationFile =
	    new runtime.flash.filesystem.File("app:/lib/updater/updateConfig.xml");
	
	appUpdater.isCheckForUpdateVisible = false;
	
	// setting the event handler for INITIALIZED
	appUpdater.addEventListener(runtime.air.update.events.UpdateEvent.INITIALIZED,
	    onUpdate);
	
	// It initializes the update framework, silently installing synchronously 
	// any pending updates. It is required to call this method during application
	// startup because it may restart the application when it is called.
	appUpdater.initialize();
});

function onUpdate(event) {
    //starts the update process
    appUpdater.checkNow();
}
