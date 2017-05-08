function compile() {
	var codeGenerationReturns = codeGeneration();

	var txt = $('#log').val();

	var codeString = codeGenerationReturns.codeString;

	console.log(codeString);

	var codeTable = codeGenerationReturns.codeArray;

	var totalWarningCount = codeGenerationReturns.totalWarningCount;
	var totalErrorCount =  codeGenerationReturns.totalErrorCount;

	var machineCode = ["A9","AD","8D","6D","A2","AE","A0","AC","EA","EC","D0","EE","FF"]; 
	var ascii = ["61","62","63","64","65","66","67","68","69","6A","6B","6C","6D","6E","6F","70","71","72","73","74","75","76","77","78","79","7A"];

	for (var i = 0; i < codeTable.length; i++) {
		if (machineCode.includes(codeTable[i]))
			codeTable[i] = "<span style=\"color:#d9534f;\">" + codeTable[i] + "</span>";
		else if (ascii.includes(codeTable[i]))
			codeTable[i] = "<span style=\"color:#5cb85c;\">" + codeTable[i] + "</span>";
		else if (hexTable.includes(codeTable[i]))
			codeTable[i] = "<span style=\"color:#286090;\">" + codeTable[i] + "</span>";
	}

	var printCode = "";
	for (var i = 0; i < codeTable.length; i++) {
		printCode = printCode + codeTable[i] + "  ";
	}
	$("#codeDisplay").attr('class', 'col-lg-12');
	$('#codeView').html(printCode);
	$('#codeView').height("130px");

	// Compilation Succeeded
	if (totalErrorCount == 0) {
		// Prints Last Semantic Analysis Message
		printLastCompileMessage(codeComplete);
	}

	function printLastCompileMessage(codeComplete) {
		if (codeComplete) {
			txt = $('#log').val(txt + "Compilation Completed With " + totalWarningCount + " WARNING(S) and " + totalErrorCount + " ERROR(S)\n");
		}
		scrollDown();
	}
}