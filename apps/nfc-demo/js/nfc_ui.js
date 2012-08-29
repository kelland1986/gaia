var nfcUI = {

pendingNdefMessage: null,
messageArea: null,
p2p: false,

hasPendingMessage: function() {
  return this.pendingNdefMessage ? true : false;
},

postPendingMessage: function(msgRecord) {
  this.pendingNdefMessage = msgRecord;
  // Open Write Dialog:
  if(!this.p2p) {
    $("#nfc_tag_write_dialog").click();
  }
},

cancelPendingWrite: function() {
  this.pendingNdefMessage = null;
},

setMessageArea: function(elementRefName) {
  this.messageArea = elementRefName;
},

writePendingMessage: function() {
  console.log("Write pending message");
  if (this.pendingNdefMessage != null) {
    console.log("Call writeRecordArrayTag");
    var pendingDomRequest = nfcWriter.writeRecordArrayTag(this.pendingNdefMessage, this.p2p);
    this.commonRequestHandler(pendingDomRequest);
    this.pendingNdefMessage = null;
  }
},

// Common Nfc UI Write Dialog.
commonRequestHandler: function(pending) {
  console.log("commonRequestHandler");
  if (pending != null) {
    console.log("bind to onsuccess/onerror");
    pending.onsuccess = function() {
      var msg = this.result;
      var message = "Tag write successful. (Message: " + msg + ")";
      console.log(message);
      // Dismiss dialog, and do anything else you want for UI/UX.
      $('.ui-dialog').dialog('close');
      if (nfcUI.messageArea == null) {
        alert("Message: " + message); 
        return;
      }
      nfcUI.appendTextAndScroll($(nfcUI.messageArea), message+"\n");
    }
    pending.onerror = function(e) {
      console.log("onerror called");
      var msg = this.error;
      // Print error object.
      var message = "Error writing tag. Result: " + msg;
      console.log(message);
      $('.ui-dialog').dialog('close');
      if (nfcUI.messageArea == null) {
        alert("Error: " + message);
        return;
      }
      nfcUI.appendTextAndScroll($(nfcUI.messageArea), message+"\n");
    }
  }
},

scrollToBottom: function(htmlElement) {
  // TODO: The animation starts scrollTop at "0" every time, rather than scroll from current position.
  htmlElement.animate({ scrollTop: htmlElement.prop("scrollHeight") - htmlElement.height() }, 0);
},

appendTextAndScroll: function(htmlElement, message) {
  htmlElement.val(htmlElement.val()+message);
  this.scrollToBottom(htmlElement);
}

}
