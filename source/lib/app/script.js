var lessparser = {};
var conn;
var dbFile;
var monitorTimer;
var modificationTimes = [];
var selectDirectory;

lessparser.init = function() {
	conn = new air.SQLConnection(); 			
	dbFile = air.File.applicationStorageDirectory.resolvePath("lessparser.db"); 
	//air.trace(dbFile.nativePath);
	if (!dbFile.exists) {    
		var dbTemplate = air.File.applicationDirectory.resolvePath("lessparser.db");  
		dbTemplate.copyTo(dbFile, true);  
	} 
	
	//sandbox code
	//var dbFile = air.File.applicationDirectory.resolvePath("lessparser.db");
	
	try {
		conn.open(dbFile);
	} catch (error) {
		//air.trace('Database error');
	}	
}

lessparser.processNavMain = function() {
	var activeItem = $('.navMain .active .page').eq(0);
	$('.tab').hide();
	$(activeItem.attr('href')).show();	
}


lessparser.projects = {
	init: function() {
		$('.projectList .list ul li').live('click', function(e) { 
			e.preventDefault();
			$('.projectList .list ul li').removeClass('active');
			$(this).closest('li').addClass('active');
			
			$('.projectInfo .list ul').empty();
			
			// look for id
			var projectId = $(this).attr('data-id');
			
			if (lessparser.projects.exists(projectId, true)){
				// get project
				var project = lessparser.projects.getProject(projectId);			
				$('.projects .projectInfo .projectFolder .detail').html(project.folder.replace(/\\/g, "/"));
				
				// fetch files for id
				lessparser.files.getFiles(projectId);
				
				$('#appFooter .action').show();
			}					
		});
	},
	exists: function(id, refresh) {
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;		
		selectStmt.text = "SELECT id FROM project WHERE id=:id;";	
		selectStmt.parameters[":id"] = id; 	
		try {
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			
			if (numRows > 0) {
				return true;
			} else {
				if (refresh) lessparser.projects.getList();
				return false;
			}
		} 
		catch (error) {
			if (refresh) lessparser.projects.getList();
			return false;
		}		
	},
	getList: function(activeProjectId){
		$('.projectList .list ul').empty();
		
		selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;
		var sql = "SELECT * FROM project ORDER BY name ASC;";
		selectStmt.text = sql;		
		try {
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			for (var i = 0; i < numRows; i++) {
				var link = $('<a href="#" class="page"></a>').html(result.data[i].name)
				var item = $('<li></li>').append(link).attr('data-id', result.data[i].id);
				$('.projectList .list ul').append(item);
				
				if (result.data[i].id == activeProjectId) {
					item.click();
				}
			}
		} 
		catch (error) {
			return;
		}		
	},
	getFolder: function(id) {
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;
		var sql = "SELECT folder FROM project WHERE id=:id;";
		selectStmt.parameters[":id"] = id; 
		selectStmt.text = sql;		
		try {
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			if (numRows > 0) {
				return result.data[0].folder
			} else {
				return false;
			}
		} 
		catch (error) {
			return false;
		}		
	},
	getProject: function(id) {
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;
		var sql = "SELECT * FROM project WHERE id=:id;";
		selectStmt.parameters[":id"] = id; 
		selectStmt.text = sql;		
		try {
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			if (numRows > 0) {
				var project = {
					id : result.data[0].id,
					name : result.data[0].name,
					folder : result.data[0].folder
				};
				
				return project;
			} else {
				return false;
			}
		} 
		catch (error) {
			return false;
		}		
	},
	nameExists : function(name, excludeid) {
		
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;
		if (excludeid) {
			var sql = "SELECT id FROM project WHERE id!=:id AND name=:name;";
			selectStmt.parameters[":id"] = excludeid; 
			selectStmt.parameters[":name"] = name;
		} else {
			var sql = "SELECT id FROM project WHERE name=:name;";
			selectStmt.parameters[":name"] = name;			
		}
		
		selectStmt.text = sql;		
		try {
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			if (numRows > 0) {
				return true;
			} else {
				return false;
			}
		} 
		catch (error) {
			return false;
		}			
	}, 
	save : function(id, name, folder) {
		var insertStmt = new air.SQLStatement();
		insertStmt.sqlConnection = conn;
		if (id > 0) {
			insertStmt.text = "UPDATE project SET name=:name, folder=:folder WHERE id=:id;";
			insertStmt.parameters[":name"] = name;
			insertStmt.parameters[":folder"] = folder;
			insertStmt.parameters[":id"] = id;
		} else {
			insertStmt.text = "INSERT INTO project (name, folder) VALUES (:name, :folder);";
			insertStmt.parameters[":name"] = name;
			insertStmt.parameters[":folder"] = folder;			
		}	
		try {
			insertStmt.execute();
			if (id > 0) return id;
			else return insertStmt.getResult().lastInsertRowID;			
		} catch (error) {
										
		}			
	},
	folderSelected: function(event) {
		$('#fieldProjectFolder').val(selectDirectory.nativePath);
	},
	remove: function(id) {
		var sqlStmt = new air.SQLStatement();
		sqlStmt.sqlConnection = conn;
		sqlStmt.text = "DELETE FROM project WHERE id=:id;";
		sqlStmt.parameters[":id"] = id;		
		try {
			sqlStmt.execute();		
			var sqlStmt2 = new air.SQLStatement();
			sqlStmt2.sqlConnection = conn;
			sqlStmt2.text = "DELETE FROM file WHERE project_id=:id;";
			sqlStmt2.parameters[":id"] = id;
			sqlStmt2.execute();				
		} catch (error) {
										
		}				
	}
};

lessparser.files = {
	init: function() {
		$('.projects .projectInfo .list li input.parse').live('change', function(e) { 
			lessparser.files.checkState('enabled', $(this));
		});
		
		$('.projects .projectInfo .list li input.minify').live('change', function(e) { 
			lessparser.files.checkState('minify', $(this));
		});
				
		$('.projects .projectInfo .refresh').click(function(e) { 
			e.preventDefault();
			lessparser.files.refresh();
		});
		
	},
	checkState : function(type, item) {
		var updateStmt = new air.SQLStatement();
		updateStmt.sqlConnection = conn;
		if (type == "minify") {
			updateStmt.text = "UPDATE file SET minify=:value WHERE id=:id;";
		} else {
			updateStmt.text = "UPDATE file SET enabled=:value WHERE id=:id;";
		}	
		updateStmt.parameters[":id"] = item.closest('li').attr('data-id'); 		
									
		if (item.is(':checked')) {
			updateStmt.parameters[":value"] = 1;
		} else {
			updateStmt.parameters[":value"] = 0;
		}
		
		updateStmt.execute();
	},
	refresh : function() {		
		var projectId = $('.projectList .list li.active').attr('data-id');
		if (projectId) {
			if (lessparser.projects.exists(projectId, true)) {
				// fetch project folder
				var  projectFolder = lessparser.projects.getFolder(projectId);
				//air.Introspector.Console.log(projectFolder);
				if (projectFolder !== false) {
					// mark all files for deletion in database (we will unmark them when the files are found during the sweep)
					var updateStmt = new air.SQLStatement();
					updateStmt.sqlConnection = conn;
					updateStmt.text = "UPDATE file SET deleted=1 WHERE project_id=:id;";
					updateStmt.parameters[":id"] = projectId;
					
					
					try {
						updateStmt.execute();
						// look for files	
						var inputDir = air.File['desktopDirectory'].resolvePath(projectFolder);
						//air.Introspector.Console.log(inputDir);			
						if (inputDir.exists) {
							$('.projects .projectInfo .list .loading').show();
							lessparser.files.processDir(projectId, inputDir, inputDir);
							
							// remove all undetected files
							var deleteStmt = new air.SQLStatement();
							deleteStmt.sqlConnection = conn;
							deleteStmt.text = "DELETE FROM file WHERE deleted=1 AND project_id=:id;";
							deleteStmt.parameters[":id"] = projectId;
							$('.projectInfo .list ul').empty();
							try {
								deleteStmt.execute();
							} 
							catch (error) {
								return false;
							}
							
							setTimeout(function(){
								$('.projects .projectInfo .list .loading').hide();
								lessparser.files.getFiles(projectId);
							}, 200);
							
						}
						else {
							alert('Invalid project folder');
						}
					} 
					catch (error) {
					}
				}											
			}
		} else {
			alert('Please select a project first');
		}		
	},
	fileExists : function(projectId, filename) {
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;
		var sql = "SELECT id FROM file WHERE project_id=:id AND filepath=:filepath;";
		selectStmt.parameters[":id"] = projectId; 
		selectStmt.parameters[":filepath"] = filename;
		selectStmt.text = sql;		
		try {
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			if (numRows > 0) {
				return result.data[0].id
			} else {
				return false;
			}
		} 
		catch (error) {
			return false;
		}			
	},
	undeleteFile: function(id) {
		var updateStmt = new air.SQLStatement();
		updateStmt.sqlConnection = conn;
		updateStmt.text = "UPDATE file SET deleted=0 WHERE id=:id;";	
		updateStmt.parameters[":id"] = id;
		try {
			updateStmt.execute();
		} catch (error) { return false; }			 						
				
	},
	processDir : function(projectId, projectDir, dir) {
		var files = dir.getDirectoryListing();
		for (var f = 0; f < files.length; f++) {
			var currentFile = files[f];
			if (!currentFile.isDirectory) {
				if (currentFile.extension == 'less') {
					// check if file exists
					
					var fileId = lessparser.files.fileExists(projectId, projectDir.getRelativePath(currentFile));
					
					if (fileId !== false) {
						lessparser.files.undeleteFile(fileId);					
					} else {
						// make entry
						var insertStmt = new air.SQLStatement();
						insertStmt.sqlConnection = conn;
						insertStmt.text = "INSERT INTO file (project_id, filename, filepath, filefolder, modificationtime, enabled, deleted) VALUES (:projectid, :filename, :filepath, :folder, :modificationtime, 1, 0);";	
						insertStmt.parameters[":projectid"] = projectId; 	
						insertStmt.parameters[":filename"] = currentFile.name; 
						insertStmt.parameters[":filepath"] = projectDir.getRelativePath(currentFile);
						insertStmt.parameters[":folder"] = projectDir.getRelativePath(dir);							
						insertStmt.parameters[":modificationtime"] = currentFile.modificationDate.time;
						try {
							insertStmt.execute();
						} catch (error) {
														
						}							
					}		
				}
			}
			else {
				lessparser.files.processDir(projectId, projectDir, currentFile);
			}
		}		
	}, 
	getFiles: function(projectId) {
		$('.projectInfo .list ul').empty();
		
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;
		var sql = "SELECT file.*, folder FROM file JOIN project ON file.project_id=project.id WHERE project_id=:projectid ORDER BY filepath, filename ASC;";			
		selectStmt.text = sql;
		selectStmt.parameters[":projectid"] = projectId;		
		try {
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			for (var i = 0; i < numRows; i++) {				
				var item = $('<li></li>').attr('data-id', result.data[i].id);
				
				var filename = $('<span class="filename"></span>').html(result.data[i].filename);
				var label = $('<label></label>');
				if (result.data[i].filefolder != '') {
					label.html(result.data[i].filefolder.replace(/\\/g, "/")+'/');					
				}				
				label.attr('for', 'file-' + i).append(filename);	
										
				/*var folder = $('<span class="folder"><span class="caption">Output folder:</span><span class="detail"></span></span>');
				folder.find('.detail').html(result.data[i].folder.replace("\\", "/")+'/'+result.data[i].filefolder.replace("\\", "/"));*/
				
				var input = $('<input type="checkbox" name="files[]" id="file-'+i+'" value="on" class="parse" />');
				if (result.data[i].enabled == 1) input.attr('checked', 'checked');
				
				var input2 = $('<input type="checkbox" name="filesMinify[]" id="fileMinify-'+i+'" value="on" class="minify" />');
				if (result.data[i].minify == 1) input2.attr('checked', 'checked');				
				
				item.append(label).append(input).append(input2);
				$('.projectInfo .list ul').append(item);
			}
		} 
		catch (error) {
	
			return;
		}		
	},
	parseFile: function(currentFile, inputFile, forced) {
		forced = typeof(forced) != 'undefined' ? forced : false;
		// get file content
		var fs = new air.FileStream();
		fs.open(inputFile, air.FileMode.READ);
		var css_content = fs.readUTFBytes(fs.bytesAvailable);
		fs.close();
		
		try {
			var parser = new(less.Parser)({
				paths: [inputFile.parent.url+'/'], // Specify search paths for @import directives
			});
			parser.parse(css_content, function(e, tree){
				try {
					if (currentFile.minify) {
						var output_css = tree.toCSS({
							compress: true
						});
						output_css = output_css.replace(/(\r\n|\n|\r)/gm,"");
					}
					else {
						var output_css = tree.toCSS();
					}
					
					stream = new air.FileStream();
			 
					 var output_file = air.File['desktopDirectory'].resolvePath(inputFile.nativePath.substring(0, inputFile.nativePath.length - 5) + '.css');
					 stream.open(output_file, air.FileMode.WRITE);
					 
					 stream.writeUTFBytes(output_css);
					 stream.close();
					lessparser.log.addLog(currentFile.filepath, currentFile.name, 'Successful');
					if (!forced) lessparser.notification.show('success', currentFile.filename, 'Successfully parsed!');
				} 
				catch (error) {
					lessparser.log.addError(currentFile.filepath, currentFile.name, "Invalid less file<br />" + error.message);
					
					if (!forced) lessparser.notification.show('error', currentFile.filename, error.message);
				}
			});
		} 
		catch (error) {
			lessparser.log.addError(currentFile.filepath, currentFile.name, "Invalid less file<br />" + error.message);
			/*lessparser.notification.show('error', currentFile.name, error.message);*/
		}		
	},
	updateModificationTime: function(id, time) {
		var updateStmt = new air.SQLStatement();
		updateStmt.sqlConnection = conn;
		updateStmt.text = "UPDATE file SET modificationtime=:time WHERE id=:id;";	
		updateStmt.parameters[":id"] = id;
		updateStmt.parameters[":time"] = time;
		try {
			updateStmt.execute();
		} catch (error) { return false; }		
	},
	parseAll: function(projectId) {
		
		lessparser.monitor.running = true;
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;
		selectStmt.text = "SELECT file.*, folder, project.name FROM file JOIN project ON file.project_id=project.id WHERE deleted=0 AND enabled=1 AND file.project_id=:project order by id;";
		try {
			selectStmt.parameters[":project"] = projectId;			
			selectStmt.execute();
			var result = selectStmt.getResult();
			var numRows = result.data.length;
			for (var i = 0; i < numRows; i++) {
				var currentFile = result.data[i];
				var inputFile = air.File['desktopDirectory'].resolvePath(currentFile.folder + '/' + currentFile.filepath);
				if (inputFile.exists) {
					//var currentModificationTime = inputFile.modificationDate.time;
					//var previousModificationTime = currentFile.modificationtime;
					//if (currentModificationTime - previousModificationTime > 0) {
						lessparser.files.parseFile(currentFile, inputFile, true);
						//lessparser.files.updateModificationTime(currentFile.id, currentModificationTime);
					//}
				}
				else { /*var d = new Date(); lessparser.files.updateModificationTime(currentFile.id, d.getTime()): lessparser.log.addError(currentFile.filepath, currentFile.name, "File doesn't exist");*/
				}
			}
		} 
		catch (error) {
		
		}
		
		lessparser.monitor.running = false;				
	}
}

lessparser.monitor = {
	running: false,
	init : function() {
		$('#fieldStartMonitoring').change(function(e) { 
			if ($(this).is(':checked')) {
				monitorTimer = setInterval(function(){lessparser.monitor.checkForChanges();}, 1000);
				//air.trace('starting monitor');				
				lessparser.options.set('monitorState', 1);				
			} else {
				clearInterval(monitorTimer);
				//air.trace('stopping monitor');	
				lessparser.options.set('monitorState', 0);
			}
		});
		
		if (lessparser.options.get('monitorState', '1') == '1') {
			$('#fieldStartMonitoring').attr('checked', 'checked').change();
		}
	},
	checkForChanges : function() {
		if (!this.running) {
			this.running = true;
			var selectStmt = new air.SQLStatement();
			selectStmt.sqlConnection = conn;
			selectStmt.text = "SELECT file.*, folder, project.name FROM file JOIN project ON file.project_id=project.id WHERE deleted=0 AND enabled=1 order by id;";
			try {
				selectStmt.execute();
				var result = selectStmt.getResult();
				var numRows = result.data.length;
				for (var i = 0; i < numRows; i++) {
					var currentFile = result.data[i];
					var inputFile = air.File['desktopDirectory'].resolvePath(currentFile.folder + '/' + currentFile.filepath);
					if (inputFile.exists) {
						var currentModificationTime = inputFile.modificationDate.time;
						var previousModificationTime = currentFile.modificationtime;
						if (currentModificationTime - previousModificationTime > 0) {
							lessparser.files.parseFile(currentFile, inputFile);
							lessparser.files.updateModificationTime(currentFile.id, currentModificationTime);
						}
					}
					else { /*var d = new Date(); lessparser.files.updateModificationTime(currentFile.id, d.getTime()): lessparser.log.addError(currentFile.filepath, currentFile.name, "File doesn't exist");*/
					}
				}
			} 
			catch (error) {
			
			}
			
			this.running = false;
		}		
	}
};

lessparser.log = { 
	addLog : function(file, project, text) {
		lessparser.log.add(file, project, text, '');
	},
	addError : function(file, project, text) {
		lessparser.log.add(file, project, text, 'error');
	},
	add : function(file, project, text, type) {
		var currentTime = new Date();
		
		var cell1 = $('<td class="timestamp"></td>').html((currentTime.getHours() < 10 ? 0 : '')+currentTime.getHours()+':'+(currentTime.getMinutes() < 10 ? 0 : '')+currentTime.getMinutes()+':'+(currentTime.getSeconds() < 10 ? 0 : '')+currentTime.getSeconds());
		var cell2 = $('<td class="project"></td>').html(project);
		var cell3 = $('<td class="file"></td>').html(file.replace(/\\/g, "/"));
		var cell4 = $('<td class="result"></td>').html(text);
		
		var tr = $('<tr></tr>').attr('class', type).append(cell1).append(cell2).append(cell3).append(cell4);
		$('.log table tbody').prepend(tr);
	}
};
var notificationFile;
var notificationMessage;
var notificationType;

lessparser.notification = {
	queue:[],
	show: function(type, file, message) {
		/*if (lessparser.options.get('showNotifications', '1') == '1') {
			if (type == 'error' && lessparser.options.get('showNotificationError', '1') == '1') {
				lessparser.notification.drawNotification(type, file, message);	
			} else if (type == 'success' && lessparser.options.get('showNotificationSuccess', '1') == '1') {
				lessparser.notification.drawNotification(type, file, message);	
			}
		}*/	
	},
	drawNotification: function(type, file, message) {
		var appFolder = air.File.applicationDirectory.resolvePath("");
		//air.Introspector.Console.log(appFolder);
		var template = '<html><head><link href=":appdir/themes/base/notification.css" rel="stylesheet" type="text/css"/><script type="text/javascript" src=":appdir/lib/air/AIRAliases.js"></script><script type="text/javascript" src=":appdir/lib/jquery/jquery-1.4.2.min.js"></script><script type="text/javascript" src=":appdir/lib/app/notification.js"></script></head><body><div id="container"><div class="containerWrap"><h1>:file</h1><div class="message :type">:message</div></div></div></body></html>';
		template = template.replace(/:file/g, file); 
		template = template.replace(/:message/g, message);
		template = template.replace(/:type/g, type);	
		template = template.replace(/:appdir/g, 'file:///'+appFolder.nativePath);	
		
		var options = new air.NativeWindowInitOptions();
		options.type = air.NativeWindowType.LIGHTWEIGHT;
		options.transparent = true;
		options.systemChrome = air.NativeWindowSystemChrome.NONE;
	
		var bounds = null;
		var screen = air.Screen.mainScreen.visibleBounds;
		var windowHeight = 60;
		var windowWidth = 300;
	
		bounds = new air.Rectangle(
			screen.width - windowWidth - 5,
			screen.height - windowHeight - 5,
			windowWidth,
			windowHeight
		);
	
		var notification = air.HTMLLoader.createRootWindow(
			true,
			options,
			false,
			bounds
		);	
		
		notification.paintsDefaultBackground = false;
		notification.stage.nativeWindow.alwaysInFront = true;
		notification.navigateInSystemBrowser = true;
		
		notification.addEventListener(air.Event.COMPLETE, doEventComplete);
		notificationFile = file;
		notificationMessage = message;
		notificationType = type;
		
		var NOTIFY_SOURCE = "notification.html";
		notification.load(new air.URLRequest( NOTIFY_SOURCE ));
		/*notification.loadString(template);*/		
	}
};

function doEventComplete(event) {
    doc = $(event.currentTarget.window.document.body);

	doc.find('h1').html(notificationFile);		
	doc.find('.message').html(notificationMessage).addClass('notificationType');
}

lessparser.configuration = {
	init: function() {
		if (lessparser.options.get('showNotifications', '1') == '1') {
			$('#fieldNotifications').attr('checked', 'checked');
			$('.configuration .subordinate').show();
		} else {
			$('.configuration .subordinate').hide();
		}
		
		if (lessparser.options.get('showNotificationSuccess', '1') == '1') {
			$('#fieldNotifications-success').attr('checked', 'checked');
		}
		
		if (lessparser.options.get('showNotificationError', '1') == '1') {
			$('#fieldNotifications-error').attr('checked', 'checked');
		}	
		
		$('#fieldNotifications').change(function(e) { 
			if ($(this).is(':checked')) {
				$('.configuration .subordinate').slideDown(300);
				lessparser.options.set('showNotifications', '1');	
			} else {
				$('.configuration .subordinate').slideUp(300);
				lessparser.options.set('showNotifications', '0');
			}
		});	
		
		$('#fieldNotifications-success').change(function(e) { 
			if ($(this).is(':checked')) lessparser.options.set('showNotificationSuccess', '1');	
			else lessparser.options.set('showNotificationSuccess', '0');
		});	
		
		$('#fieldNotifications-error').change(function(e) { 
			if ($(this).is(':checked')) lessparser.options.set('showNotificationError', '1');	
			else lessparser.options.set('showNotificationError', '0');
		});	
					
	}
};
lessparser.options = {
	values: {},
	load: function() {
		var selectStmt = new air.SQLStatement();
		selectStmt.sqlConnection = conn;		
		selectStmt.text = "SELECT * FROM options";		
		try {
			var options = {};
			//selectStmt.parameters[":key"] = optionName;
			selectStmt.execute();
			var result = selectStmt.getResult();
			
			var numRows = result.data.length;
			for (var i = 0; i < numRows; i++) {
				var t = result.data[i].key;
				lessparser.options.values[result.data[i].key] = result.data[i].value;
			}
		} catch (error) {			
			return '';
		}		
	},
	get : function(optionName, defaultValue) {
		if (typeof lessparser.options.values[optionName] !== undefined) {
			return lessparser.options.values[optionName];
		} else return defaultValue;
	},
	set : function(optionName, optionValue) {
		lessparser.options.values[optionName] = optionValue;
		
		var updateStmt = new air.SQLStatement();
		updateStmt.sqlConnection = conn;		
		updateStmt.text = "INSERT INTO options (key, value) VALUES (:key, :value);";		
		updateStmt.parameters[":key"] = optionName;
		updateStmt.parameters[":value"] = optionValue;
		try {
			updateStmt.execute();
		} catch (error) {
			//air.Introspector.Console.log(error);
		}			
	}
};
function onResize() {
    var nativeWin = window.nativeWindow;
    setTimeout(function(){    	
		$('body').css('height', nativeWin.height-38);
    	/*var projectsHeight = nativeWin.height - 167;
		var logsHeight = nativeWin.height - 141;*/
		/*$('.log .table').css('height', logsHeight);
		$('.projects .projectList .list').css('height', projectsHeight);*/
    }, 0);	
	
}

lessparser.overlay = {
	show: function(elm) {
		
	},
	hide: function(elm) {
		$('body').removeClass('jPop');	
	},
	hideOvrProject: function() {
		lessparser.overlay.hide($('.ovrAddProject'));	
		$('#fieldProjectName').val('');
		$('#fieldProjectFolder').val('');
		$('#fieldProjectId').val('');	
		$('.ovrAddProject .feedback').hide();	
	}
}
$(document).ready(function() { 
	lessparser.init();
	lessparser.options.load();
	
	lessparser.processNavMain();
	
	lessparser.projects.init();
	lessparser.projects.getList();
	lessparser.files.init();
	lessparser.monitor.init();
	lessparser.configuration.init();
		
	$('.navMain li .page').click(function(e) { 		
		$('.navMain li').removeClass('active');
		$(this).closest('li').addClass('active');
		lessparser.processNavMain();
		return false;
	});
	
	$('.projects .actions .add').click(function(e) { 
		e.preventDefault();
		$('body').addClass('jPop');
	});
	
	$('.projects .actions .edit').click(function(e) {
		e.preventDefault();
		
		// fetch project data
		if ($('.projects .list li.active').length) {	
			var activeProject = $('.projects .list li.active').eq(0);		
			var activeProjectId = activeProject.attr('data-id');
			if (lessparser.projects.exists(activeProjectId, true)) {
				var project = lessparser.projects.getProject(activeProjectId);
				if (project !== false) {
					$('.ovrAddProject .overlayHeader h1 span').html('Edit project');
					$('#fieldProjectName').val(project.name);
					$('#fieldProjectFolder').val(project.folder);
					$('#fieldProjectId').val(project.id);
					$('body').addClass('jPop');
				}
			}							
		}		
	});
	
	$("#fieldParseAll").click(function(e) { 
		e.preventDefault();
		// fetch project data
		if ($('.projects .list li.active').length) {
			var activeProject = $('.projects .list li.active').eq(0);
			var activeProjectId = activeProject.attr('data-id');
			if (lessparser.projects.exists(activeProjectId, true)) {
				$('.navMain .logLink a').click();
				lessparser.files.parseAll(activeProjectId);			
			}
		}		
	});
	
	$('.projects .actions .delete').click(function(e) {
		e.preventDefault();
		
		// fetch project data
		if ($('.projects .list li.active').length) {	
			var activeProject = $('.projects .list li.active').eq(0);		
			var activeProjectId = activeProject.attr('data-id');
			if (lessparser.projects.exists(activeProjectId, true)) {
				lessparser.projects.remove(activeProjectId);
				lessparser.projects.getList();
				$('.projects .projectInfo .list ul').empty();
				$('#appFooter .action').hide();
				$('.projectFolder .detail').html('');
			}							
		}		
	});	
	
	$('.ovrAddProject .abort a').click(function(e) { 
		lessparser.overlay.hideOvrProject();
	});
	
	$('.ovrAddProject form').submit(function(e) {
		e.preventDefault();
		//alert('submitting');
		if ($('#fieldProjectName').val().length == 0) $('#fieldProjectName').closest('.formRow').find('.feedback').show().html('Invalid project name');
		if ($('#fieldProjectFolder').val().length == 0) $('#fieldProjectFolder').closest('.formRow').find('.feedback').show();
				
		if ($('#fieldProjectName').val().length > 0 && $('#fieldProjectFolder').val().length > 0) {
			var activeProjectId = $('#fieldProjectId').val();
			if (lessparser.projects.nameExists($('#fieldProjectName').val(), activeProjectId)) {
				
				$('#fieldProjectName').closest('.formRow').find('.feedback').show().html('Project already exists');
			}
			else {
				// check if folder exists
				var inputDir = air.File['desktopDirectory'].resolvePath($('#fieldProjectFolder').val());
				if (inputDir.exists) {
					//air.Introspector.Console.log(inputDir);
					$('.ovrAddProject form .feedback').hide();
					var activeProjectId = lessparser.projects.save(activeProjectId, $('#fieldProjectName').val(), inputDir.nativePath);
					lessparser.projects.getList(activeProjectId);
					lessparser.overlay.hideOvrProject();					
					lessparser.files.refresh();						
				} else {
					$('#fieldProjectFolder').closest('.formRow').find('.feedback').show().html('Folder doesn\'t exist');
				}						
			}
		}
		

	});
	
	$('#btnProjectFolderSelect').click(function(e) { 
		e.preventDefault();
		if ($('#fieldProjectFolder').val()) {
			selectDirectory = air.File['desktopDirectory'].resolvePath($('#fieldProjectFolder').val());
		} else {
			selectDirectory = air.File['desktopDirectory'];			
		}
		selectDirectory.addEventListener( air.Event.SELECT, lessparser.projects.folderSelected );
		selectDirectory.browseForDirectory( "Project folder" );		
	});
	
    window.nativeWindow.addEventListener(air.Event.RESIZE, onResize);
});
