var windowFade;

$(document).ready(function() { 

	
	//air.trace($(document).getUrlParam("file"));
	
	$("#container").fadeIn(300, function() { 
		windowFade = window.setTimeout(function() { 
			$("#container").fadeOut(300, function() { 
				nativeWindow.close();
			});
		}, 1500);				
	});	
		
});
