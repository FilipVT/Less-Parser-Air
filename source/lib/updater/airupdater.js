/*
	Written by Robert Nyman, http://www.robertnyman.com
	Inspired by http://www.insideria.com/2008/03/air-api-performing-updates-in-1.html, and then modified
*/
var AIRUpdater = function () {
	// This is only used for the filename of the installer
	var applicationName = "LessParser.air";
	var applicationVersion = 0;
	var latestVersion = 0;
	/*
		URL to go to to check the value of the <version> and <releasenotes>
		The value in version is compared to the one in the applications XML setup file,
		and an update dialog is triggered if the <version> in the below XML file is higher
		From there on, suggested alternatives for the end user is to
		start an update or cancel it for the moment

		Suggested XML structure:

		<?xml version="1.0" encoding="UTF-8"?>
		<application>
			<latestversion>0.7</latestversion>
			<releasenotes>Added automatic update downloading feature.</releasenotes>
		</application>
	*/
	var latestVersionCheckUrl = "http://www.proving-ground.be/less/versioning.xml";
	var updateAvailable = null;
	var updateAvailableDialog = null;
	var releaseNotes = null;
	var releaseNotesText = "";
	/*
		Change this URL to the download URL of your AIR app. Version number
		and ".air" extension will automatically be added; version taken
		from the XML value found in the latestVersionCheckUrl page
	*/
	var updaterUrl = "http://www.proving-ground.be/less/files/lessparser-";
	var stream = null;
	var updateFile = null;

	var getApplicationVersion = function () {
		// This will get the version of the currently installed application
		var appXML = air.NativeApplication.nativeApplication.applicationDescriptor;
		var xmlObject = new DOMParser().parseFromString(appXML, "text/xml");
		applicationVersion = parseFloat(xmlObject.getElementsByTagName('version')[0].firstChild.nodeValue);
	};

	var getLatestVersion = function () {
		/*
			Checks for what the latest available version is
			from the URL specified in latestVersionCheckUrl
		*/
		var XMLHttp = new XMLHttpRequest();
		XMLHttp.onreadystatechange = function () {
			if (XMLHttp.readyState === 4) {
				var response = XMLHttp.responseXML;
				var releaseNotesNode = response.getElementsByTagName("releasenotes")[0];
				/*
					Adds a reference to a releaseNote for the latest version,
					IF a <releasenotes> node exists
				*/
				if (typeof releaseNotesNode === "object" && releaseNotesNode.firstChild) {
					releaseNotesText = releaseNotesNode.firstChild.nodeValue;
				}
				var latestVersionNode = response.getElementsByTagName("latestversion")[0];
				/*
					Triggers a version comparison with the existing installed application,
					IF a <latestversion> node exists
				*/
				if (typeof latestVersionNode === "object" && latestVersionNode.firstChild) {
					latestVersion = parseFloat(latestVersionNode.firstChild.nodeValue, 10);
					compareVersions();
				}
			}
		};
		XMLHttp.open("GET", latestVersionCheckUrl, true);
		XMLHttp.send(null);
	};

	var compareVersions = function () {
		if (applicationVersion > 0 && latestVersion > 0 && latestVersion > applicationVersion) {
			/*
				Here you should, for example, present an "Update available" to your
				end user, and give them the option to start the update
				The code below is just sample code:
			*/

			// Present release notes for the new version available
			document.getElementById("release-notes").innerHTML = releaseNotesText;

			// Add onclick event to start update button
			document.getElementById("update-application").onclick = initUpdateApplication;

			// Add onclick event to cancel update button
			document.getElementById("cancel-update").onclick = function () {
				document.getElementById("update-available-dialog").style.display = "none";
			};

			// Show the update dialog to the end user
			document.getElementById("update-available-dialog").style.display = "block";
		}
	};

	var initUpdateApplication = function () {
		/*
			The updating has started. Prefereably, you'd like to hide
			or disable the start and cancel update buttons now
		*/
		stream = new air.URLStream();

		/*
			This event is recommend to give the end user continuous
			feedback about how the update goes
		*/
		stream.addEventListener(air.ProgressEvent.PROGRESS, updatingStatus);

		stream.addEventListener(air.Event.COMPLETE, updateApplication);

		// Note that the latest version number and ".air" extension is automatically added
		stream.load( new air.URLRequest(updaterUrl + latestVersion + ".air"));
	};

	var updatingStatus = function (e) {
		// This is example code to show updating status
		var percentage = Math.round((e.bytesLoaded / e.bytesTotal) * 100);
		document.getElementById("current-updating-status").innerHTML = percentage + "%";
	};

	updateApplication = function () {
		var ba = new air.ByteArray();
		stream.readBytes(ba, 0, stream.bytesAvailable);
		updateFile = air.File.applicationStorageDirectory.resolvePath(applicationName);
		fileStream = new air.FileStream();
		fileStream.addEventListener( air.Event.CLOSE, installUpdate );
		fileStream.openAsync(updateFile, air.FileMode.WRITE);
		fileStream.writeBytes(ba, 0, ba.length);
	 	fileStream.close();
	};

	var installUpdate = function () {
		var updater = new air.Updater();
		// Notice that the version name has to be present as a second parameter
		updater.update(updateFile, latestVersion.toString());
	};

	return {
		init : function () {
			getApplicationVersion();
			getLatestVersion();
		}
	};
}();
window.onload = AIRUpdater.init;