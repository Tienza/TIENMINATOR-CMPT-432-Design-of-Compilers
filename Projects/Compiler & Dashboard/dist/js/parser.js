function parse() {
	// Assigns LEXER return values to be used in PARSER
	var lexReturns = lex();
	var lambdaChar = "\u03BB";
	
	if (lexComplete) {
		// Prints start of Parsing Session
		var txt = $('#log').val();
		txt = $('#log').val(txt + "Beginning Parsing Session...\n\n");
		txt = $('#log').val();
		
		// Sets carry-over variables from LEXER to be used in PARSER
		var tokens = lexReturns.tokenArray;
		
		// Resets and initialize Parser Error and Warning Count
		var parseErrorCount = 0;
		var parseWarningCount = 0;
		
		// Initialize Parser Variables
		var currentToken = 0;
		
		// Creates Concrete Syntax Tree and adds root node
		var cst = new Tree();
		cst.addNode("Root", "branch");
		
		// Initialize parsing of Program
		parseProgram();
		
		// Parsing Succeeded - Determines how parsing went and updates appropriate fields
		if (parseErrorCount == 0) {
			// Parse Success
			parseComplete = true;
			
			// Updates Progess Status Bar
			if (parseWarningCount == 0) 
				$('#parseResults').html("<span style=\"color:green;\"> PASSED </span>");
			else
				$('#parseResults').html("<span style=\"color:#d58512;\"> PASSED </span>");
			// Prints Last Parse Message
			printLastParseMessage(parseComplete);
		}
		// Parsing Failed
			/* See throwParseError() */
		
		// Variable to store all objects moving onto semantic analysis
		var parseReturns = {
			tokenArray: tokens,
			astLexemes: lexReturns.astLexemes,
			totalWarningCount: parseWarningCount + lexReturns.warningCount,
			totalErrorCount: parseErrorCount + lexReturns.errorCount
		}
		
		/*if (verbose)
			console.log(parseReturns);*/

		// Break Teeth
		if(parseComplete)
			brokenTeeth(2);
		
		return parseReturns;
	}
	
	/************************************************** Token Parsing Section **************************************************/
	function parseProgram() {
		// Creates a Program Branch
		cst.addNode("Program", "branch", "");
		
		// Initialize parsing of Block
		parseBlock();
		
		// Checks and consumes the character following the Block is a T_EOPS
		if (matchToken(tokens[currentToken].kind, "T_EOPS")) {
			if (verbose)
				printParseMessage("T_EOPS", "");
			// Creates [ $ ] leaf
			cst.addNode("$", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("$");

		// Kicks you one level up the tree
		cst.kick();
		
		// Checks to see if there is another program (If there is then run parse again)
		if (currentToken < tokens.length) {
			parseProgram();
		}
	}
	
	function parseBlock() {
		// Creates a Block Branch
		cst.addNode("Block", "branch");
		
		// Checks and consumes the required first character of a Block [ { ]
		if (matchToken(tokens[currentToken].kind, "T_OPENING_BRACE")) {
			if (verbose)
				printParseMessage("T_OPENING_BRACE", "");
			// Creates [ { ] leaf
			cst.addNode("{", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("{");
		
		// Initialize parsing of StatementList
		parseStatementList();
		
		// Checks and consumes the required last character of a Block [ } ]
		if (matchToken(tokens[currentToken].kind, "T_CLOSING_BRACE")){
			if (verbose)
				printParseMessage("T_CLOSING_BRACE", "");
			// Creates [ } ] leaf
			cst.addNode("}", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("}");
		
		// Kicks you one level up the tree
		cst.kick();
	}
	
	function parseStatementList() {
		// Creates a StatementList Branch
		cst.addNode("StatementList", "branch");
		
		// Checks to see if the following is a statement is another statement
		if (tokens[currentToken].kind == "T_PRINT" || tokens[currentToken].kind == "T_ID" || tokens[currentToken].kind == "T_VARIABLE_TYPE" || tokens[currentToken].kind == "T_WHILE" || tokens[currentToken].kind == "T_IF" || tokens[currentToken].kind == "T_OPENING_BRACE") {
			if (verbose)
				printParseMessage("Statement", "Statement");
			// Initialize parsing of Statement
			parseStatement();	
		}

		// Kicks you one level up the tree
		cst.kick();

		// Checks to see if following the statement is another statement
		if (tokens[currentToken].kind == "T_PRINT" || tokens[currentToken].kind == "T_ID" || tokens[currentToken].kind == "T_VARIABLE_TYPE" || tokens[currentToken].kind == "T_WHILE" || tokens[currentToken].kind == "T_IF" || tokens[currentToken].kind == "T_OPENING_BRACE") {
			if (verbose)
				printParseMessage("StatementList", "Statement");
			// Initialize parsing of Statement
			parseStatementList();
		}
		// Empty production
		else {
			if (verbose)
				printParseMessage(lambdaChar, "");
			/* Do Nothing λ Production */
		}
		
		// Kicks you one level up the tree
		//cst.kick();
	}
	
	function parseStatement() {
		// Creates a StatementList Branch
		cst.addNode("Statement", "branch");
		
		// Checks to see if the following token is the start of a PrintStatement
		if (tokens[currentToken].kind == "T_PRINT") {
			if (verbose)
				printParseMessage("PrintStatement", "");
			// Initialize parsing of PrintStatement
			parsePrint();
		}
		// Checks to see if the following token is the start of an AssignmentStatement
		else if (tokens[currentToken].kind == "T_ID") {
			if (verbose)
				printParseMessage("AssignmentStatement", "");
			// Initialize parsing of AssignmentStatement
			parseAssignment();
		}
		// Checks to see if the following token is the start of a VarDecl
		else if (tokens[currentToken].kind == "T_VARIABLE_TYPE") {
			if (verbose)
				printParseMessage("VarDecl", "");
			// Initialize parsing of VarDecl
			parseVarDecl();
		}
		// Checks to see if the following token is the start of a WhileStatement
		else if (tokens[currentToken].kind == "T_WHILE") {
			if (verbose)
				printParseMessage("WhileStatement", "");
			// Initialize parsing of WhileStatement
			parseWhile();
		}
		// Checks to see if the following token is the start of a IfStatement
		else if (tokens[currentToken].kind == "T_IF") {
			if (verbose)
				printParseMessage("IfStatement", "");
			// Initialize parsing of IfStatement
			parseIf();
		}
		
		else if (tokens[currentToken].kind == "T_OPENING_BRACE") {
			if (verbose)
				printParseMessage("T_OPENING_BRACE", "");
			parseBlock();
		}
		// Throws an error if the character does not match what is expected
		else 
			throwParseError("print | T_ID & T_ASSIGNMENT_OP | T_ID | while | if | {");
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parsePrint() {
		// Creates a PrintStatement Branch
		cst.addNode("PrintStatement", "branch");
		
		// Checks and consumes the required first character of print [ T_PRINT ]
		if (matchToken(tokens[currentToken].kind, "T_PRINT")) {
			if (verbose)
				printParseMessage("T_PRINT", "");
			// Creates [ print ] leaf
			cst.addNode("print", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("print");
		
		// Checks and consumes the required second character of print [ ( ]
		if (matchToken(tokens[currentToken].kind, "T_OPENING_PARENTHESIS")) {
			if (verbose)
				printParseMessage("T_OPENING_PARENTHESIS", "");
			// Creates [ ( ] leaf
			cst.addNode("(", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("(");
		
		// Initialize parsing of Expr
		parseExpr();
		
		// Checks and consumes the required last character of print [ ) ]
		if (matchToken(tokens[currentToken].kind, "T_CLOSING_PARENTHESIS")) {
			if (verbose)
				printParseMessage("T_CLOSING_PARENTHESIS", "");
			// Creates [ ) ] leaf
			cst.addNode(")", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError(")");
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseAssignment() {
		// Creates a AssignmentStatement Branch
		cst.addNode("AssignmentStatement", "branch");
		
		// Checks required first character of assignment statement [ T_ID ]
		if (matchToken(tokens[currentToken].kind, "T_ID")) {
			if (verbose)
				printParseMessage("T_ID", "T_ID");
			parseId();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("T_ID")
		
		// Checks and consumes required second character of assignment statement [ T_ASSIGNMENT_OP ]
		if (matchToken(tokens[currentToken].kind, "T_ASSIGNMENT_OP")) {
			if (verbose)
				printParseMessage("T_ASSIGNMENT_OP", tokens[currentToken].value);
			// Creates [ = ] leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("=")
		
		// Initialize parsing of Expr
		parseExpr();
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseVarDecl() {
		// Creates a VariableDeclaration Branch
		cst.addNode("VariableDeclaration", "branch");
		
		// Checks required first character of VariableDeclaration [ T_VARIABLE_TYPE ]
		if (matchToken(tokens[currentToken].kind, "T_VARIABLE_TYPE")) {
			if (verbose)
				printParseMessage("T_VARIABLE_TYPE", "");
			// Initialize parsing of Type
			parseType();
		}
		// Throws an error if the character does not match what is expected
		else 
			throwParseError("T_VARIABLE_TYPE");
		
		// Checks required second character of VariableDeclaration [ T_ID ]
		if (matchToken(tokens[currentToken].kind, "T_ID")) {
			if (verbose)
				printParseMessage("T_ID", "");
			// Initialize parsing of Id
			parseId();
		}
		// Throws an error if the character does not match what is expected
		else 
			throwParseError("T_ID");
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseWhile() {
		// Creates a WhileStatement Branch
		cst.addNode("WhileStatement", "branch");
		
		// Checks and consumes the required first character of WhileStatement
		if (matchToken(tokens[currentToken].kind, "T_WHILE")) {
			if (verbose)
				printParseMessage("T_WHILE", tokens[currentToken].value);
			// Creates [ while ] leaf
			cst.addNode("while", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else 
			throwParseError("while");
		
		// Initialize parsing of BooleanExpr
		parseBooleanExpr();
		
		// Initialize parsing of Block
		parseBlock();
		
		// Kicks you one level up the tree
		cst.kick();
	}
	
	function parseIf() {
		// Creates a IfStatement Branch
		cst.addNode("IfStatement", "branch");
		
		// Checks and consumes the required first character of IfStatement
		if (matchToken(tokens[currentToken].kind, "T_IF")) {
			if (verbose)
				printParseMessage("T_IF", tokens[currentToken].value);
			// Creates [ if ] leaf
			cst.addNode("if", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else 
			throwParseError("if");
		
		// Initialize parsing of BooleanExpr
		parseBooleanExpr();
		
		// Initialize parsing of Block
		parseBlock();
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseExpr() {
		// Creates a Expr Branch
		cst.addNode("Expr", "branch");
		
		// Checks the required first character of IntExpr [ T_DIGIT ]
		if (matchToken(tokens[currentToken].kind, "T_DIGIT")) {
			if (verbose)
				printParseMessage("Expr", "IntExpr");
			// Initialize parsing of IntExpr
			parseIntExpr();
		}
		// Checks the required first character of IntExpr [ T_QUOTE ]
		else if (matchToken(tokens[currentToken].kind, "T_QUOTE")) {
			if (verbose)
				printParseMessage("Expr", "StringExpr");
			// Initialize parsing of StringExpr
			parseStringExpr();
		}
		// Checks the first possible character of BooleanExpr [ T_OPENING_PARENTHESIS ]
		else if (matchToken(tokens[currentToken].kind, "T_OPENING_PARENTHESIS")) {
			if (verbose)
				printParseMessage("Expr", "BooleanExpr");
			// Initialize parsing of BooleanExpr
			parseBooleanExpr();
		}
		// Checks the second possible character of BooleanExpr [ T_BOOLEAN_VALUE ]
		else if (matchToken(tokens[currentToken].kind, "T_BOOLEAN_VALUE")) {
			if (verbose)
				printParseMessage("Expr", "BooleanExpr");
			// Initialize parsing of BooleanExpr
			parseBooleanExpr();
		}
		// Checks the required first character of Id [ T_ID ]
		else if (matchToken(tokens[currentToken].kind, "T_ID")) {
			if (verbose)
				printParseMessage("Expr", "Id");
			// Initialize parsing of Id
			parseId();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("IntExpr || StringExpr || BooleanExpr || Id");
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseIntExpr() {
		// Creates a IntExpr Branch
		cst.addNode("IntExpr", "branch");
		
		// Checks the required first and second character of AdditionOp [ T_DIGIT & T_ADDITION_OP ]
		if (matchToken(tokens[currentToken].kind, "T_DIGIT") && matchToken(tokens[currentToken+1].kind, "T_ADDITION_OP")) {
			if (verbose)
				printParseMessage("IntExpr", "");
			// Initialize parsing of digit
			parseDigit();
			// Initialize parsing of IntOp
			parseIntOp();
			// Initialize parsing of Expr
			parseExpr();
			
		}
		// Checks the required character to be a digit [ T_DIGIT ]
		else if (matchToken(tokens[currentToken].kind, "T_DIGIT")) {
			if (verbose)
				printParseMessage("IntExpr", "IntExpr");
			parseDigit();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("T_DIGIT & T_ADDITION_OP || T_DIGIT");
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseStringExpr() {
		// Creates a StringExpr Branch
		cst.addNode("StringExpr", "branch");
		
		// Checks and consumes the required first character of StringExpr [ T_QUOTE ]
		if (matchToken(tokens[currentToken].kind, "T_QUOTE")) {
			if (verbose)
				printParseMessage("T_QUOTE", "");
			// Creates [ \" ] leaf
			cst.addNode("\"", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("\"");
		
		// Initialize parsting of CharList
		parseCharList();
			
		// Checks and consumes the required last character of StringExpr [ T_QUOTE ]
		if (matchToken(tokens[currentToken].kind, "T_QUOTE")) {
			if (verbose)
				printParseMessage("T_QUOTE", "");
			// Creates [ \" ] leaf
			cst.addNode("\"", "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("\"");
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseBooleanExpr() {
		// Creates a BooleanExpr Branch
		cst.addNode("BooleanExpr", "branch");
		
		// Checks and consumes the required first character of BooleanExpr(1) [ T_OPENING_PARENTHESIS ]
		if (matchToken(tokens[currentToken].kind, "T_OPENING_PARENTHESIS")) {
			if (verbose)
				printParseMessage("T_OPENING_PARENTHESIS", tokens[currentToken].value);
			// Creates [ ( ] leaf
			cst.addNode("(", "leaf", tokens[currentToken].line);
			consumeToken();
			// Initialize parsing of Expr
			parseExpr();
			// Initialize parsing of BoolOp
			parseBoolOp();
			// Initialize parsing of Expr
			parseExpr();
			// Checks and consumes the required last character of BooleanExpr(1) [ T_CLOSING_PARENTHESIS ]
			if (matchToken(tokens[currentToken].kind, "T_CLOSING_PARENTHESIS")) {
				if (verbose)
					printParseMessage("T_CLOSING_PARENTHESIS", tokens[currentToken].value);
				// Creates [ ) ] leaf
				cst.addNode(")", "leaf", tokens[currentToken].line);
				consumeToken();
			}
			// Throws an error if the character does not match what is expected
			else
				throwParseError(")");
		}
		// Checks the required first character of BooleanExpr(2) [ T_BOOLEAN_VALUE ]
		else if (matchToken(tokens[currentToken].kind, "T_BOOLEAN_VALUE")) {
			if (verbose)
				printParseMessage("T_BOOLEAN_VALUE", "");
			parseBoolVal();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("( | == | !=");
		
		// Kicks you one level up the tree
		cst.kick();
	}

	function parseId() {
		// Creates a Id Branch
		cst.addNode("Id", "branch");
		
		// Checks and consumes the required first character of Id [ T_ID ]
		if (matchToken(tokens[currentToken].kind, "T_ID")) {
			if (verbose)
				printParseMessage("T_ID", tokens[currentToken].value);
			// Creates [ Id ] leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
		else
			throwParseError("T_ID");

		// Kicks you one level up the tree
		cst.kick();
	}

	function parseCharList() {
		// Creates a CharList Branch
		cst.addNode("CharList", "branch");
		
		// Checks the required first character of CharList [ T_CHAR ]
		if (matchToken(tokens[currentToken].kind, "T_CHAR")) {
			if (verbose)
				printParseMessage("T_CHAR", "");
			parseChar();
		}
		// Empty production
		else {
			if (verbose)
				printParseMessage(lambdaChar, "");
			/* Do Nothing λ Production */
		}
		
		// Kicks you one level up the tree
		cst.kick();
	}
	
	function parseType() {
		// Checks and consumes the required first character of type [ T_VARIABLE_TYPE ]
		if (matchToken(tokens[currentToken].kind, "T_VARIABLE_TYPE")) {
			if (verbose)
				printParseMessage("T_VARIABLE_TYPE", tokens[currentToken].value);
			// Creates [ type ] leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
	}

	function parseChar() {
		// Checks and consumes the required first character of Char [ T_CHAR ]
		if (matchToken(tokens[currentToken].kind, "T_CHAR")) {
			if (verbose)
				printParseMessage("T_CHAR", tokens[currentToken].value);
			// Creates a char leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
			parseCharList();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("T_CHAR");
	}

	function parseDigit() {
		// Checks and consumes the required character to be a digit [ T_DIGIT ]
		if (matchToken(tokens[currentToken].kind, "T_DIGIT")) {
			if (verbose)
				printParseMessage("T_DIGIT", tokens[currentToken].value);
			// Creates a Digit leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("T_DIGIT");
	}
	
	function parseBoolOp() {
		// Checks and consumes the first possible character of BoolOp [ T_EQUALITY_OP ]
		if (matchToken(tokens[currentToken].kind, "T_EQUALITY_OP")) {
			if (verbose)
				printParseMessage("T_EQUALITY_OP", tokens[currentToken].value);
			// Creates [ == ] leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Checks and consumes the second possible character of BoolOp [ T_EQUALITY_OP ]
		else if (matchToken(tokens[currentToken].kind, "T_INEQUALITY_OP")) {
			if (verbose)
				printParseMessage("T_INEQUALITY_OP", tokens[currentToken].value);
			// Creates [ != ] leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("== || !=");
	}
	
	function parseBoolVal() {
		// Checks and consumes the first required character of BoolOp [ T_BOOLEAN_VALUE ]
		if (matchToken(tokens[currentToken].kind, "T_BOOLEAN_VALUE")) {
			if (verbose)
				printParseMessage("T_BOOLEAN_VALUE", tokens[currentToken].value);
			// Creates [ T_BOOLEAN_VALUE ] leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("true || false");
	}
	
	function parseIntOp() {
		// Checks and consumes the required character of IntOp [ T_ADDITION_OP ]
		if (matchToken(tokens[currentToken].kind, "T_ADDITION_OP")) {
			if (verbose)
				printParseMessage("T_ADDITION_OP", tokens[currentToken].value);
			// Creates a IntOp leaf
			cst.addNode(tokens[currentToken].value, "leaf", tokens[currentToken].line);
			consumeToken();
		}
		// Throws an error if the character does not match what is expected
		else
			throwParseError("+");
	}
	
	/*********************************************** Token Manipulation Section ***********************************************/
	// Matches token and returns True if it matches
	function matchToken(tokenKind, expectedKind){
		var match;
		
		if (tokenKind == expectedKind)
			match = true;
		else
			match = false;
		
		return match;
	}
	// Increments token count and moves to next token
	function consumeToken() {
		currentToken++;
	}
	
	/************************************************ Message Printing Section ************************************************/
	function printParseMessage(expectVal, foundVal) {
		if (foundVal !== "")
			txt = txt + " PARSER --> | PASSED! Expecting [ " + expectVal + " ] found [ " + foundVal + " ] on line " + tokens[currentToken].line + "...\n";
		else if (expectVal == lambdaChar)
			txt = txt + " PARSER --> | PASSED! " + expectVal + " production on line " + tokens[currentToken].line + "...\n";
		else
			txt = txt + " PARSER --> | PASSED! Expecting [ " + expectVal + " ] found [ " + tokens[currentToken].kind + " ] on line " + tokens[currentToken].line + "...\n";

	}

	function printLastParseMessage(parseComplete) {
		if (parseComplete) {
			txt = $('#log').val(txt + "\nParse Completed With " + parseWarningCount + " WARNING(S) and " + parseErrorCount + " ERROR(S)" + "...\n_______________________________________________________________\n\n");
			$('#cstLog').val(cst.toString());
			$('#cstLog2').val(cst.toString());
		}
		
		else {
			txt = $('#log').val(txt + "\nParse Failed With " + parseWarningCount + " WARNING(S) and " + parseErrorCount + " ERROR(S)" + "...");
		}
		
		scrollDown();
	}
	
	/************************************************* Error Printing Section *************************************************/
	function throwParseError(expectVal) {
		txt = txt + " PARSER --> | ERROR! Expecting [ " + expectVal + " ] found [ " + tokens[currentToken].value + " ] on line " + tokens[currentToken].line + "...\n";
		parseErrorCount++;
		printLastParseMessage(parseComplete);
		// Updates Progess Status Bar
		$('#parseResults').html("<span style=\"color:red;\"> FAILED </span>");
		throw new Error("HOLY SHIT! IT DIED..." + "Expecting [ " + expectVal + " ] found [ " + tokens[currentToken].value + " ] on line " + tokens[currentToken].line + "...\n");
	}
}