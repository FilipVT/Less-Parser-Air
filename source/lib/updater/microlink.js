
/**
 * Function called when the microlink is called to update 
 * the div with remote content.
 * 
 * @param {element} e the element that fired the event.
 */
function onClickMicroLink(e)  {
	var elID = e.id;
	var divID = elID.substr(0, elID.length-2); // remove trailing '_a'
	
	$('#'+elID).after(' <div id="'+ divID +'" class="microdiv" ' +
			'style="display:none"></div>');
			
	// Performs an AJAX request and updates a container's contents 
	// based on the response text.
	// @see http://docs.jquery.com/Ajax
	$.ajax({
		url: e.href,
		dataType: 'text',
		cache: false,
		success: function(text){
			$('#'+divID).append(text);
			$('#'+divID).fadeIn("slow");
		}
	});
}


 

 