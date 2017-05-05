function codeGeneration() {
	var semanticAnalysisReturns = semanticAnalysis();

	if (verbose)
		console.log(semanticAnalysisReturns);

	// Creates local copies of Semantic Analysis Returns to be operated on
	var ast = semanticAnalysisReturns.AST;
	var st = semanticAnalysisReturns.ST;
	var tokens = semanticAnalysisReturns.tokenArray;
	var symbols = semanticAnalysisReturns.symbolArray;

	// Initialize Code Generation Error and Warning Counts
	var cgErrorCount = 0;
	var cgWarningCount = 0;
	
	// Initialize Console Variables
	var txt = $('#log').val();
	txt = $('#log').val(txt + "Beginning Code Generation Session...\n\n");
	txt = $('#log').val();

	// Initialize Code Generation Variables
	var codeTable = [];
	var staticTable = [];
	var stringTable = [];
	var jumpTable = [];
	var maxByteSize = 256;
	var curMemLoc = maxByteSize - 1;
	var varKeyScope = 0;
	var varTempAddr = "";
	var depth = 0;
	var varLocHead = "T";
	var varLocNum = -1;
	var jumpHead = "J";
	var jumpNum = -1;
	var stringHead = "S";
	var stringNum = -1;
	var printStringCalled = 0;

	/********************************************** Code Gen - 6502a Instructions **********************************************/
	var loadAccWithConst = "A9"; /* LDA - Load the accumulator with a constant */
	var loadAccFromMemo  = "AD"; /* LDA - Load the accumulator from memory */
	var storeAccInMemo   = "8D"; /* STA - Store the accumulator in memory */
	var addWithCarry     = "6D"; /* ADC - Adds contents of an address to the accumulator and 
										  keeps the result in the accumulator */
	var loadXWithConst   = "A2"; /* LDX - Load the X register with a constant */
	var loadXFromMemo    = "AE"; /* LDX - Load the X register from memory */
	var loadYWithConst   = "A0"; /* LDY - Load the Y register with a constant */
	var loadYFromMemo    = "AC"; /* LDY - Load the Y register from memory */
	var noOperation      = "EA"; /* NOP - No Operation */
	var breakOp          = "00"; /* BRK - Break (which is really a system call) */
	var compareMemoToX   = "EC"; /* CPX - Compare a byte in memory to the X register. Sets the Z 
										  (zero) flag if equal */
	var branchNBytes     = "D0"; /* BNE - Branch n bytes if z flag = 0 */
	var increment        = "EE"; /* INC - Increment the value of a byte */
	var systemCall       = "FF"; /* SYS - System Call
										  #$01 in X reg = print the integer stored in the Y 
										  register.
										  #$02 in X reg = print the 00-terminated string stored 
										  at the address in the Y register */

	// Begin Code Generation
	generate();
	/*console.log(toHex("t"));
	console.log(toHex("there is no spoon"));
	console.log(toHex(5));*/

	// Code Generation Succeeded - Determines how code generation went and updates appropriate fields
	if (cgErrorCount == 0) {
		// Code Generation Success
		codeComplete = true;
		
		// Updates Progess Status Bar
		if (cgWarningCount == 0) 
			$('#cgResults').html("<span style=\"color:green;\"> PASSED </span>");
		else
			$('#cgResults').html("<span style=\"color:#d58512;\"> PASSED </span>");
		// Prints Last Semantic Analysis Message
		printLastCGMessage(codeComplete);
	}
	// Code Generation Failed
		/* See throwError Section of Code */

	/********************************************** Code Gen - Traversing AST *************************************************/
	function generate() {
		traverseTree(ast.root, 0);
		pushHex(breakOp);
		var fullSymbolTable = getFullSymbolTable(st.root);
		fullSymbolTable = flattenStaticTable(fullSymbolTable);
		console.log(codeTable);
		console.log(fullSymbolTable);
		backPatchStringVal(codeTable, fullSymbolTable);
		backPatchStatVal(codeTable, fullSymbolTable);
		backPatchJumpVal(codeTable, jumpTable);
		console.log(codeTable);
		console.log(fullSymbolTable);
		console.log(jumpTable);
		var str = "";
		for (var i = 0; i < codeTable.length; i++) {
			str = str + codeTable[i] + " ";
		}
		console.log(str);
	}

	function traverseTree(node, depth) {
        // Space out based on the current depth so
        // this looks at least a little tree-like.
        for (var i = 0; i < depth; i++) {
        }

        // If there are no children (i.e., leaf nodes)...
        if (!node.children || node.children.length === 0) {
        	console.log(node.name + " at depth " + depth);

        } 
        // See what's kind of node we are currently on and decides which function to call
		else {
			console.log(node.name + " at depth " + depth);
			if (node.name == "Root")
				rootCodeGen(node.children, depth);
			else if (node.name == "Program")
				programCodeGen(node.children, depth);
			else if (node.name == "Block")
				blockCodeGen(node.children, depth);
			else if (node.name == "VariableDeclaration")
				varDeclCodeGen(node, depth);
			else if (node.name == "AssignmentStatement")
				assignStateCodeGen(node, depth);
			else if (node.name == "PrintStatement")
				printStateCodeGen(node, depth);
			else if (node.name == "IfStatement")
				ifStateCodeGen(node, depth);
			else {
				console.log("I got here...");
				for (var i = 0; i < node.children.length; i++) {
                	traverseTree(node.children[i], depth + 1);
            	}
			}
        }

        function rootCodeGen(node, depth) {
        	// Continues the traversal
        	console.log("Generating Code For Root");
        	for (var i = 0; i < node.length; i++) {
                traverseTree(node[i], depth + 1);
            }
            console.log("Root Finished codeTableLoc: " + codeTable.length);

            return codeTable.length;
        }

        function programCodeGen(node, depth) {
        	// Continues the traversal
        	console.log("Generating Code For Program");
        	for (var i = 0; i < node.length; i++) {
                traverseTree(node[i], depth + 1);
            }
            console.log("Program Finished codeTableLoc: " + codeTable.length);

            return codeTable.length;
        }

        function blockCodeGen(node, depth) {
        	// Continues the traversal
        	if (verbose) {
        		printFoundBranch(node.name, node.line, node.scope);
        		console.log("Generating Code For Block");
        	}

        	var startBlock = codeTable.length;
            for (var i = 0; i < node.length; i++) {
                traverseTree(node[i], depth + 1);
            }
            var endBlock = codeTable.length;
            var hexGenNum = endBlock - startBlock;
            console.log("Block Finished codeTableLoc: " + codeTable.length);
        	console.log("Block Finished Hex Generated: " + hexGenNum);

            return codeTable.length;
        }

        function varDeclCodeGen(node, depth) {
        	// Generates code for Varaible Declarations
        	if (verbose) {
        		printFoundBranch(node.name, node.line, node.scope);
        		console.log("Generating Code For VariableDeclaration");
        	}

        	varLocNum++;
        	var startVarDecl = codeTable.length;
        	var endVarDecl = 0;
        	var hexGenNum = 0;
        	// Assigns the nodes to local variables
        	var typeNode = node.children[0];
        	var varKeyNode = node.children[1];
        	// Checks to see if the variable is an int or boolean
        	if (typeNode.name == "int" || typeNode.name == "boolean") {
        		pushHex(loadAccWithConst);
        		pushHex("00");
        		if (/^[a-z]$/.test(varKeyNode.name)) {
        			pushHex(storeAccInMemo);
        			// Creates the Temporary Location Reference Name
        			var tempLoc = varLocHead + varLocNum;
        			pushHex(tempLoc);
        			pushHex("XX");
        			// Assigns The Temporary Location Name to the appropriate symbol in the symbol table
        			assignTempLoc(varKeyNode.name, node.scope, tempLoc+"XX");
        			var elem = new tempVarElem(tempLoc+"XX", varKeyNode.name, 0, node.scope);
        			staticTable.push(elem);
        		}
        	}
            else if (typeNode.name == "string") {
                stringNum++;
                pushHex(loadAccWithConst);
                pushHex("00");
                pushHex(storeAccInMemo);
                var tempLoc = varLocHead + varLocNum;
                pushHex(tempLoc);
                pushHex("XX");
                // Assings the Temporary Loc and Store Name to the appropriate symbol in the symbol table
                assignTempLoc(varKeyNode.name, node.scope, stringHead+stringNum+"XX");
                assignTempStore(varKeyNode.name, node.scope, tempLoc+"XX");
            }

    		endVarDecl = codeTable.length;
    		hexGenNum = endVarDecl - startVarDecl;

        	console.log("VariableDeclaration Finished codeTableLoc: " + codeTable.length);
        	console.log("VariableDeclaration Finished Hex Generated: " + hexGenNum);

        	return hexGenNum;
        }

        function assignStateCodeGen(node, depth) {
        	if (verbose) {
        		printFoundBranch(node.name, node.line, node.scope);
        		console.log("Generating Code For AssignmentStatement");
        	}

        	var startAssign = codeTable.length;
        	var endAssign = 0;
        	var hexGenNum = 0;
        	// Assigns the nodes to local vairables
        	var varKeyNode = node.children[0];
        	var assignValNode = node.children[1];
        	// Checks to see if the assigning value is an int or not
        	if (assignValNode.type == "T_DIGIT") {
        		console.log(varKeyNode.name);
        		console.log(varKeyNode.scope);
        		//var tempLoc = getStaticTableLoc(varKeyNode.name,varKeyNode.scope);
        		var tempLoc = getTempLoc(varKeyNode.name, varKeyNode.scope);
        		var assignVal = "0" + assignValNode.name;
        		if (verbose)
        			printAssignLeaf(varKeyNode.name, varKeyNode.line, assignVal);

        		pushHex(loadAccWithConst);
        		pushHex(assignVal);
        		pushHex(storeAccInMemo);
        		pushHex(tempLoc[0]);
        		pushHex(tempLoc[1]);
        	}
        	// Checks to see if the assigning value is a boolean or not
        	else if (assignValNode.type == "T_BOOLEAN_VALUE") {
        		console.log(varKeyNode.name);
        		console.log(varKeyNode.scope);
        		// Gets the Temporary Location of the variable being assigned
        		var tempLoc = getTempLoc(varKeyNode.name, varKeyNode.scope);
        		var assignVal = "";
        		if (assignValNode.name == "true")
        			assignVal = "01";
        		else
        			assignVal = "00";

        		if (verbose)
        			printAssignLeaf(varKeyNode.name, varKeyNode.line, assignVal);

        		pushHex(loadAccWithConst);
        		pushHex(assignVal);
        		pushHex(storeAccInMemo);
        		pushHex(tempLoc[0]);
        		pushHex(tempLoc[1]);
        	}
        	// Checks to see if the assigning value is an id
        	else if (assignValNode.type == "T_ID") {
        		console.log(varKeyNode.name);
        		console.log(varKeyNode.scope);
        		// Gets the Temporary Location of both the variable being assigned and the assigning varaible
        		var tempLocVar = getTempLoc(varKeyNode.name, varKeyNode.scope);
        		var tempLocVal = getTempLoc(assignValNode.name, assignValNode.scope);

        		if (verbose)
        			printAssignLeaf(varKeyNode.name, varKeyNode.line, assignValNode.name);

        		pushHex(loadAccFromMemo);
        		pushHex(tempLocVal[0]);
        		pushHex(tempLocVal[1]);
        		pushHex(storeAccInMemo);
        		pushHex(tempLocVar[0]);
        		pushHex(tempLocVar[1]);
        	}
            // Check to see if the assigning value is a string
            else if (assignValNode.type == "T_CHARLIST") {
                console.log(varKeyNode.name);
                console.log(varKeyNode.scope);
                var stringHex = toHex(assignValNode.name);
                stringHex.push("00");
                var scope = getScope(varKeyNode.scope);
                console.log(stringHex);
                assignHexVal(scope, varKeyNode.name, stringHex);
                // Gets the Temporary Location of the variable being assigned
                var tempLocVar = getTempLoc(varKeyNode.name, varKeyNode.scope);
                var tempStoreVal = getTempStore(varKeyNode.name, varKeyNode.scope);

                if (verbose)
                    printAssignLeaf(varKeyNode.name, varKeyNode.line, assignValNode.name);

                pushHex(loadAccWithConst);
                pushHex(tempStoreVal[0]);
                pushHex(storeAccInMemo);
                pushHex(tempLocVar[0]);
                pushHex(tempLocVar[1]);
            }

        	endAssign = codeTable.length;
        	hexGenNum = endAssign - startAssign;

        	console.log("AssignmentStatement Finished codeTableLoc: " + codeTable.length);
        	console.log("AssignmentStatement Finished Hex Generated: " + hexGenNum);

        	return hexGenNum;
        }
    }

    function printStateCodeGen(node, depth) {
    	if (verbose) {
        	printFoundBranch(node.name, node.line, node.scope);
    		console.log("Generating Code For PrintStatement");
    	}
    	var startPrint = codeTable.length;
    	var endPrint = 0;
    	var hexGenNum = 0;
    	var printNode = node.children[0];
    	// Checks to see if the value being printed is a variable or not
    	if (printNode.type == "T_ID") {
    		console.log(printNode.name);
        	console.log(printNode.scope);
        	// Checks to see if the value being printed in an int or bool type
        	var scope = getScope(printNode.scope);
        	var type = getVarType(scope, printNode.name);

        	console.log("Variable [ " + printNode.name + " ] has type [ " + type + " ]");

        	if (type == "int" || type == "boolean") {
	        	// Gets the Temporary Location of the variable being printed
	        	var tempLoc = getTempLoc(printNode.name, printNode.scope);
	        	pushHex(loadYFromMemo);
	        	pushHex(tempLoc[0]);
	        	pushHex(tempLoc[1]);
	        	pushHex(loadXWithConst);
	        	pushHex("01");
        	}

            else if (type == "string") {
                var tempLoc = getTempLoc(printNode.name, printNode.scope);
                var tempStore = getTempStore(printNode.name, printNode.scope);

                pushHex(loadYWithConst);
                pushHex(tempLoc[0]);
                pushHex(storeAccInMemo);
                pushHex(tempStore[0]);
                pushHex(tempStore[1]);
                pushHex(loadXWithConst);
                pushHex("02");
            }
    	}
    	// Checks to see if the value being printed is an int or not
    	else if (printNode.type == "T_DIGIT") {
    		var printInt = "0" + printNode.name;
    		pushHex(loadYWithConst);
    		pushHex(printInt);
    		pushHex(loadXWithConst);
    		pushHex("01");
    	}
    	// Checks to see if the value being printed is a string
    	else if (printNode.type == "T_CHARLIST") {
    		stringNum++;
    		varLocNum++;
    		printStringCalled = 1;
    		var hexVal = toHex(printNode.name);
    		hexVal.push("00");
    		var scope = getScope(printNode.scope);
    		console.log(hexVal);
    		var elem = new Symbol("string"+stringNum, "string", printNode.line, printNode.scope, parseInt(scope.name[scope.name.length-1]), true, true, stringHead+stringNum+"XX", hexVal, varLocHead+varLocNum+"XX");
    		scope.symbols.push(elem);
    		var tempLoc = getTempLoc("string"+stringNum, printNode.scope);
    		var tempStore = getTempStore("string"+stringNum, printNode.scope);

    		pushHex(loadAccFromMemo);
    		pushHex(tempLoc[0]);
    		pushHex(tempLoc[1]);
    		pushHex(loadYWithConst);
    		pushHex(tempLoc[0]);
    		pushHex(storeAccInMemo);
    		pushHex(tempStore[0]);
    		pushHex(tempStore[1]);
    		pushHex(loadXWithConst);
    		pushHex("02");
    	}

        pushHex(systemCall);

    	endPrint = codeTable.length;
    	hexGenNum = endPrint - startPrint;

    	console.log("PrintStatement Finished codeTableLoc: " + codeTable.length);
        console.log("PrintStatement Finished Hex Generated: " + hexGenNum);

    	return hexGenNum;
    }

    function ifStateCodeGen(node, depth) {
    	if (verbose) {
    		printFoundBranch(node.name, node.line, node.scope);
    		console.log("Generating Code For IfStatement");
    	}
    	jumpNum++;
    	var startIf = codeTable.length;
    	var endIf = 0;
    	var hexGenNum = 0;
    	var booleanExpNode = node.children[0];
    	var blockNode = node.children[1];
    	if (booleanExpNode.name == "Equality")
    		equalityCodeGen(booleanExpNode, depth);
    	
    	// Push JumpVal to Jump Table
    	var jumpName = jumpHead + jumpNum;
    	var elem = new jumpVarElem(jumpName,"?");
    	jumpTable.push(elem)

    	pushHex(branchNBytes);
    	pushHex(jumpName);

    	// Traverse Tree for Block
    	var startBlock = codeTable.length;
    	traverseTree(blockNode, depth);
    	var endBlock = codeTable.length;
    	var blockHexGenNum = endBlock - startBlock;
    	if (printStringCalled != 0) {
    		blockHexGenNum = blockHexGenNum + printStringCalled;
    		printStringCalled = 0;
    	}
    	console.log("Jump Distance for Block: " + blockHexGenNum);

    	for (var i = 0; i < jumpTable.length; i++) {
    		if (jumpTable[i].tempName == jumpName)
    			jumpTable[i].distance = "0" + blockHexGenNum;
    	}

    	endIf = codeTable.length;
    	hexGenNum = endIf - startIf;

    	console.log("IfStatement Finished codeTableLoc: " + codeTable.length);
        console.log("IfStatement Finished Hex Generated: " + hexGenNum);
    }

    function equalityCodeGen(node, depth) {
    	if (verbose) {
    		printFoundBranch(node.name, node.line, node.scope);
    		console.log("Generating Code For Equality");
    	}
    	var startEquality = codeTable.length;
    	var endEquality = 0;
    	var hexGenNum = 0;
    	var leftNode = node.children[0];
    	var rightNode = node.children[1];

    	// If the right comparator is a digit we need to store it in memory
    	if (rightNode.type == "T_DIGIT") {
    		varLocNum++;
    		var compInt = "0" + rightNode.name;
			var scope = getScope(rightNode.scope);
			var tempLoc = varLocHead + varLocNum;
			var numSymbol = new Symbol(rightNode.name, "int", rightNode.line, rightNode.scope, parseInt(scope.name[scope.name.length-1]), true, true, tempLoc+"XX");
			scope.symbols.push(numSymbol);

    		pushHex(loadAccWithConst);
    		pushHex(compInt);
    		pushHex(storeAccInMemo);
    		pushHex(tempLoc);
    		pushHex("XX");
    	}

    	// Checks if left comparator is an id
    	if (leftNode.type == "T_ID") {
    		var tempLoc = getTempLoc(leftNode.name, leftNode.scope);

    		pushHex(loadXFromMemo);
    		pushHex(tempLoc[0]);
    		pushHex(tempLoc[1]);
    		pushHex(compareMemoToX);
    	}
    	// Checks if the left compartor is a digit
    	else if (leftNode.type == "T_DIGIT") {
    		var compInt = "0" + leftNode.name;

    		pushHex(loadXWithConst);
    		pushHex(compInt);
    		pushHex(compareMemoToX);
    	}

    	// Checks if right comparator is an id or digit
    	if (rightNode.type == "T_ID" || rightNode.type == "T_DIGIT") {
    		var tempLoc = getTempLoc(rightNode.name, rightNode.scope);

    		pushHex(tempLoc[0]);
    		pushHex(tempLoc[1]);
    	}

    	endEquality = codeTable.length;
    	hexGenNum = endEquality - startEquality;

    	console.log("IfStatement Finished codeTableLoc: " + codeTable.length);
        console.log("IfStatement Finished Hex Generated: " + hexGenNum);
    }

 	function pushHex(hexVal) {
 		codeTable.push(hexVal);
 		if (verbose)
 			printPushHex(hexVal);
 	}

 	function backPatchStringVal(codeTable, stringTable) {
 		//var dynamicMemStart = hexTable[codeTable.length + 1];
 		var codeLocs = [];
 		var codeLocNum = -1;

 		for (var symbol = 0; symbol < stringTable.length; symbol++) {
 			if (stringTable[symbol].type == "string") {
 				var dynamicMemStart = hexTable[codeTable.length];
 				codeLocs.push(dynamicMemStart + "00");
 				for (var hexVal = 0; hexVal < stringTable[symbol].stringHex.length; hexVal++) {
 					codeTable.push(stringTable[symbol].stringHex[hexVal]);
 				}
 			}
 		}

 		console.log(codeLocs);

 		for (var symbol = 0; symbol < stringTable.length; symbol++) {
 			if (stringTable[symbol].type == "string") {
 				codeLocNum++;
	 			var tempLoc = chunk(stringTable[symbol].tempLoc,2);
	 			console.log(tempLoc);
	 			var tempStore = chunk(stringTable[symbol].tempStore,2);
	 			console.log(tempStore);
	 			var codeLoc = chunk(codeLocs[codeLocNum],2);
	 			console.log(codeLoc);
		 		for (var newLoc = 0; newLoc < codeLocs.length; newLoc++) {
		 			for (var hexCode = 0; hexCode < codeTable.length-1; hexCode++) {
		 				if (codeTable[hexCode] == tempLoc[0] && codeTable[hexCode+1] == tempLoc[1]) {
		 					if (verbose)
		 						printStatValBackPatch(stringTable[newLoc].tempLoc, codeLocs[newLoc]);
		 					codeTable[hexCode] = codeLoc[0];
		 					codeTable[hexCode+1] = codeLoc[1];
		 				}
		 				else if (codeTable[hexCode] == tempLoc[0]) {
		 					if (verbose)
		 						printStatValBackPatch(stringTable[newLoc].tempLoc, codeLocs[newLoc]);
		 					codeTable[hexCode] = codeLoc[0];
		 				}
		 			}
		 		}
		 	}
 		}

 		for (var symbol = 0; symbol < stringTable.length; symbol++) {
			if (stringTable[symbol].type == "string") {
 				stringTable[symbol].tempLoc = codeLocs[symbol];
			}
 		}
 	}

 	function backPatchStatVal(codeTable, staticTable) {
 		var staticMemStart = hexTable[codeTable.length + 1];
 		var tempLocs = [];

 		for (var symbol = 0; symbol < staticTable.length; symbol++) {
 			if (staticTable[symbol].type == "int" || staticTable[symbol].type == "boolean")
 				tempLocs.push(staticTable[symbol].tempLoc);
 			else
 				tempLocs.push(staticTable[symbol].tempStore);
 		}

 		console.log(tempLocs);
		console.log("Static Memory Starts At: " + staticMemStart);

		var endCode = codeTable.length;
		for (var loc = 0; loc < tempLocs.length; loc++) {
			endCode++;
			var availMem = hexTable[endCode];
			tempLocs[loc] = availMem + "00";
		}

		console.log(tempLocs);

		for (var newLoc = 0; newLoc < tempLocs.length; newLoc++) {
 			var codeLoc = chunk(tempLocs[newLoc],2);
 			var tempLoc = "";
 			if (staticTable[newLoc].type == "int" || staticTable[newLoc].type == "boolean")
 				tempLoc = chunk(staticTable[newLoc].tempLoc,2);
 			else
 				tempLoc = chunk(staticTable[newLoc].tempStore,2);

 			for (var hexCode = 0; hexCode < codeTable.length-1; hexCode++) {
 				if (codeTable[hexCode] == tempLoc[0] && codeTable[hexCode+1] == tempLoc[1]) {
 					if (verbose)
 						printStatValBackPatch(staticTable[newLoc].tempLoc, tempLocs[newLoc]);
 					codeTable[hexCode] = codeLoc[0];
 					codeTable[hexCode+1] = codeLoc[1];
 				}
                else if (codeTable[hexCode] == tempLoc[0]) {
                    if (verbose)
                        printStatValBackPatch(staticTable[newLoc].tempLoc, tempLoc[newLoc]);
                    codeTable[hexCode] = codeLoc[0];
                }
 			}
 		}

		for (var symbol = 0; symbol < staticTable.length; symbol++) {
			if (staticTable[symbol].type == "int" || staticTable[symbol].type == "boolean")
 				staticTable[symbol].tempLoc = tempLocs[symbol];
            else
                staticTable[symbol].tempStore = tempLocs[symbol];
 		}
 	}

 	function backPatchJumpVal(codeTable, jumpTable) {
 		for (var i = 0; i < jumpTable.length; i++) {
 			var jumpName = jumpTable[i].tempName;
 			var jumpDistance = jumpTable[i].distance;
 			for (var hexCode = 0; hexCode < codeTable.length; hexCode++) {
 				
 				if (codeTable[hexCode] == jumpName) {
 					if (verbose)
 						printJumpBackPatch(jumpName, jumpDistance);
 					codeTable[hexCode] = jumpDistance;
 				}
 			}
 		}
 	}

 	function getFullSymbolTable(node) {
 		var staticMem = [];

 		if (node.symbols.length > 0) {
			console.log("Adding Symbols to Static Memory...");
			staticMem.push(node.symbols);
			for (var child = 0; child < node.children.length; child++) {
				console.log("Going to children...");
				var tempArray = getFullSymbolTable(node.children[child]);
				staticMem.push(tempArray);
			}
		}
		else {
			for (var child = 0; child < node.children.length; child++) {
				var tempArray = getFullSymbolTable(node.children[child]);
				staticMem.push(tempArray);
			}
		}

		return staticMem;
 	}

 	function flattenStaticTable(array) {
 		var flattenedTable = array;
		var arrayDepth = array_depth(array);

		for (i = 0; i < arrayDepth; i++) {
			flattenedTable = [].concat.apply([], flattenedTable);
		}

		return flattenedTable;

		function array_depth(array) {
			var max_depth = 0;

			array.forEach(function(value) {
				if (Array.isArray(value)) {
					var depth = array_depth(value) + 1;
		
					if (depth > max_depth) {
						max_depth = depth;
					}
				}
			});

			return max_depth;
		}
 	}

    function assignHexVal(node, varKey, stringHex) {
        if ((node.parent != undefined || node.parent != null) && node.symbols.length > 0) {
            for (var symbol = 0; symbol < node.symbols.length; symbol++) {
                if (varKey == node.symbols[symbol].getKey()) {
                    console.log("Assigning String Hex to variable [ " + varKey + " ]");
                    node.symbols[symbol].stringHex = stringHex;
                    break;
                }
                else if (symbol == node.symbols.length-1 && (node.parent != undefined || node.parent != null)) {
                    assignHexVal(node.parent, varKey, stringHex);
                }
            }
        }
        else if (node.parent != undefined || node.parent != null) {
            assignHexVal(node.parent, varKey, stringHex);
        }
    }

 	function getTempStore(varKey, varKeyScope) {
 		var node = traverseST(st.root, varKeyScope);
 		console.log("Returning scope where variable was assigned...");
 		console.log(node);
 		var tempStore = getLocForVal(node, varKey);
 		console.log(tempStore);
 		tempStore = chunk(tempStore,2);

 		return tempStore;

 		function traverseST(node, varKeyScope) {
 			var returnNode;
 			if (node.scope == varKeyScope) {
 				console.log("Found matching scope branch...");
 				returnNode = node;
 			}
 			else {
 				for (var scope = 0; scope < node.children.length; scope++) {
 					returnNode = traverseST(node.children[scope], varKeyScope);
 					if (returnNode != null || returnNode != undefined)
 						break;
 				}
 			}

 			return returnNode;
 		}

 		function getLocForVal(node, varKey) {
 			var tempStore = "";
 			if ((node.parent != undefined || node.parent != null) && node.symbols.length > 0) {
	 			for (var symbol = 0; symbol < node.symbols.length; symbol++) {
	 				if (varKey == node.symbols[symbol].getKey()) {
	 					console.log("Retrieving TempStore for variable [ " + varKey + " ]");
	 					tempStore = node.symbols[symbol].tempStore;
	 					break;
	 				}
	 				else if (symbol == node.symbols.length-1 && (node.parent != undefined || node.parent != null)) {
	 					tempStore = getLocForVal(node.parent, varKey);
	 				}
	 			}
 			}
 			else if (node.parent != undefined || node.parent != null) {
				tempStore = getLocForVal(node.parent, varKey);
			}

 			return tempStore;
 		}
 	}

 	function getTempLoc(varKey, varKeyScope) {
 		var node = traverseST(st.root, varKeyScope);
 		console.log("Returning scope where variable was assigned...");
 		console.log(node);
 		var tempLoc = getLocForVal(node, varKey);
 		console.log(tempLoc);
 		tempLoc = chunk(tempLoc,2);

 		return tempLoc;

 		function traverseST(node, varKeyScope) {
 			var returnNode;
 			if (node.scope == varKeyScope) {
 				console.log("Found matching scope branch...");
 				returnNode = node;
 			}
 			else {
 				for (var scope = 0; scope < node.children.length; scope++) {
 					returnNode = traverseST(node.children[scope], varKeyScope);
 					if (returnNode != null || returnNode != undefined)
 						break;
 				}
 			}

 			return returnNode;
 		}

 		function getLocForVal(node, varKey) {
 			var tempLoc = "";
 			if ((node.parent != undefined || node.parent != null) && node.symbols.length > 0) {
	 			for (var symbol = 0; symbol < node.symbols.length; symbol++) {
	 				if (varKey == node.symbols[symbol].getKey()) {
	 					console.log("Retrieving TempLoc for variable [ " + varKey + " ]");
	 					tempLoc = node.symbols[symbol].tempLoc;
	 					break;
	 				}
	 				else if (symbol == node.symbols.length-1 && (node.parent != undefined || node.parent != null)) {
	 					tempLoc = getLocForVal(node.parent, varKey);
	 				}
	 			}
 			}
 			else if (node.parent != undefined || node.parent != null) {
				tempLoc = getLocForVal(node.parent, varKey);
			}

 			return tempLoc;
 		}
 	}

 	function getScope(digitScope) {
 		var node = traverseST(st.root ,digitScope);

 		return node;

 		function traverseST(node, digitScope) {
 			var returnNode;
 			if (node.scope == digitScope) {
 				console.log("Found matching scope branch...");
 				returnNode = node;
 			}
 			else {
 				for (var child = 0; child < node.children.length; child++) {
 					returnNode = traverseST(node.children[child], digitScope);
 					if (returnNode != null || returnNode != undefined)
 						break;
 				}
 			}
 			console.log(returnNode);
 			return returnNode;
 		}
 	}

 	function getVarType(node, varKey) {
 		var varType = "";
		if ((node.parent != undefined || node.parent != null) && node.symbols.length > 0) {
			for (var symbol = 0; symbol < node.symbols.length; symbol++) {
				if (varKey == node.symbols[symbol].getKey()) {
					console.log("Retrieving Type for variable [ " + varKey + " ]");
					varType = node.symbols[symbol].type;
					break;
				}
				else if (symbol == node.symbols.length-1 && (node.parent != undefined || node.parent != null)) {
					varType = getVarType(node.parent, varKey);
				}
			}
		}
		else if (node.parent != undefined || node.parent != null) {
			varType = getVarType(node.parent, varKey);
		}

		return varType;
 	}

    function assignTempStore(varKey, varKeyScope, tempStore) {
        var node = traverseST(st.root, varKeyScope);

        for (var symbol = 0; symbol < node.symbols.length; symbol++) {
            if (varKey == node.symbols[symbol].getKey()) {
                node.symbols[symbol].tempStore = tempStore;
                break;
            }
        }

        console.log(node);

        return node;

        function traverseST(node, varKeyScope) {
            var returnNode;
            if (node.scope == varKeyScope) {
                console.log("Found matching scope branch...");
                returnNode = node;
            }
            else {
                for (var child = 0; child < node.children.length; child++) {
                    returnNode = traverseST(node.children[child], varKeyScope);
                    if (returnNode != null || returnNode != undefined)
                        break;
                }
            }
            console.log(returnNode);
            return returnNode;
        }
    }

 	function assignTempLoc(varKey, varKeyScope, tempLoc) {
 		var node = traverseST(st.root, varKeyScope);

 		for (var symbol = 0; symbol < node.symbols.length; symbol++) {
 			if (varKey == node.symbols[symbol].getKey()) {
 				node.symbols[symbol].tempLoc = tempLoc;
 				break;
 			}
 		}

 		console.log(node);

 		return node;

 		function traverseST(node, varKeyScope) {
 			var returnNode;
 			if (node.scope == varKeyScope) {
 				console.log("Found matching scope branch...");
 				returnNode = node;
 			}
 			else {
 				for (var child = 0; child < node.children.length; child++) {
 					returnNode = traverseST(node.children[child], varKeyScope);
 					if (returnNode != null || returnNode != undefined)
 						break;
 				}
 			}
 			console.log(returnNode);
 			return returnNode;
 		}
 	}
/*
 	function getStaticTableLoc(varKey, varKeyScope) {
 		var tempLoc = "";
 		while (varKeyScope != -1) {
			for (var i = 0; i < staticTable.length; i++) {
				if (varKey == staticTable[i].getVarKey() && varKeyScope == staticTable[i].getScope()) {
					tempLoc = staticTable[i].getTempLoc();
					break;
				}
			}
			if (tempLoc == "")
				varKeyScope = varKeyScope - 1;
			else
				break;
		}
 		tempLoc = chunk(tempLoc,2);

 		return tempLoc;
 	}
*/
 	function toHex(val) {
		var hex = "";
		for(var i = 0; i < val.length; i++) {
			hex += "" + val.charCodeAt(i).toString(16).toUpperCase();
		}
		hex = chunk(hex, 2);
		return hex;
	}

	function chunk(str, n) {
		var ret = [];
		for(i = 0; i < str.length; i += n) {
	    	ret.push(str.substr(i, n))
	    }

		return ret
	}

	/************************************************ Message Printing Section ************************************************/
	function printFoundBranch(branchName, lineNum, scopeNum) {
		notBranches = ["Root","Program"];
		branches = ["Block","PrintStatement","AssignmentStatement","VariableDeclaration","WhileStatement","IfStatement","Addition","Equality","Inequality"];
		if (!notBranches.includes(branchName) && branches.includes(branchName))
			txt = txt + " C.GEN --> | Found! [ " + branchName + " ] Branch on line " + lineNum + " in scope " + scopeNum + "...\n";
	}

	function printFoundLeaf(leafName, lineNum, scopeNum) {
		txt = txt + " C.GEN --> | Found! [ " + leafName + " ] Leaf on line " + lineNum + " in scope " + scopeNum + "...\n";
	}

	function printPushHex(hexVal) {
		txt = txt + " C.GEN --> | Pushing [ " + hexVal + " ] byte to memory...\n";
	}

	function printStatValBackPatch(hexVal, statMem) {
		txt = txt + " C.GEN --> | BackPatching memory location for [ " + hexVal + " ] to [ " + statMem + " ]...\n";
	}

	function printJumpBackPatch(hexVal, jumpDistance) {
		txt = txt + " C.GEN --> | BackPatching jump distance for [ " + hexVal + " ] to [ " + jumpDistance + " ]...\n";
	}

	function printPushStaticTable(elem) {
		txt = txt + " C.GEN --> | Pushing [ " + elem + " ] to Static Table...\n";
	}

	function printAssignLeaf(varKey, lineNum, value) {
		txt = txt + " C.GEN --> | Variable [ " + varKey + " ] on line " + lineNum + " is assigned [ " + value + " ]...\n";
	}

	function printCompareLeaf(varKey, lineNum, value) {
		if (value == "")
			txt = txt + " C.GEN --> | Variable [ " + varKey + " ] on line " + lineNum + " is being comapred with a value...\n";
		else
			txt = txt + " C.GEN --> | Variable [ " + varKey + " ] on line " + lineNum + " is compared to [ " + value + " ]...\n";
	}

	function printLastCGMessage(codeComplete) {
		if (codeComplete) {
			txt = $('#log').val(txt + "\nCode Generation Completed With " + cgWarningCount + " WARNING(S) and " + cgErrorCount + " ERROR(S)" + "...\n_______________________________________________________________\n\n");
		}
		
		else {
			txt = $('#log').val(txt + "\nCode Generation Failed With " + cgWarningCount + " WARNING(S) and " + cgErrorCount + " ERROR(S)" + "...");
		}
		
		scrollDown();
	}

	/************************************************* Error Printing Section *************************************************/
	function throwCodeGenError(reason) {
		cgErrorCount++;
		printLastCGMessage(codeComplete);
		txt = txt + " S.ANALYZE --> | ERROR! " + reason;
		// Updates Progess Status Bar
		$('#cgResults').html("<span style=\"color:red;\"> FAILED </span>");
		throw new Error("HOLY SHIT! IT DIED..." + reason);
	}
}