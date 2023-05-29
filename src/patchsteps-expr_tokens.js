export const TOKEN_GETTER = {
        "precedence": 17,
        "type": "#",
        "match": "#"
};
export const TOKEN_COMMA = {
        "precedence": 1,
        "assocLeft": true,
        "type": ",",
        "match": ","
};
export const TOKEN_OPERATORS = [{
        "precedence": 18,
        "type": "(",
        "match": "("
    },
    {
        "precedence": 18,
        "type": ")",
        "match": ")"
    },

    {
        "precedence": 17,
        "type": "[",
        "match": "["
    },
    {
        "precedence": 17,
        "type": "]",
        "match": "]"
    },
	TOKEN_GETTER,
    {
        "precedence": 13,
        "assocLeft": false,
        "type": "**",
        "match": "**"
    },
    {
        "precedence": 12,
        "assocLeft": true,
        "type": "*",
        "match": "*"
    },
    {
        "precedence": 12,
        "assocLeft": true,
        "type": "/",
        "match": "/"
    },
    {
        "precedence": 12,
        "assocLeft": true,
        "type": "%",
        "match": "%"
    },
    {
        "precedence": 11,
        "assocLeft": true,
        "type": "+",
        "match": "+"
    },
    {
        "precedence": 11,
        "assocLeft": true,
        "type": "-",
        "match": "-"
    },
    {
        "precedence": 10,
        "assocLeft": true,
        "type": "<<",
        "match": "<<"
    },
    {
        "precedence": 10,
        "assocLeft": true,
        "type": ">>",
        "match": ">>"
    },
    {
        "precedence": 10,
        "assocLeft": true,
        "type": ">>>",
        "match": ">>>"
    },
    {
        "precedence": 9,
        "assocLeft": true,
        "type": "<",
        "match": "<"
    },
    {
        "precedence": 9,
        "assocLeft": true,
        "type": "<=",
        "match": "<="
    },
    {
        "precedence": 9,
        "assocLeft": true,
        "type": ">",
        "match": ">"
    },
	{
        "precedence": 9,
        "assocLeft": true,
        "type": ">=",
        "match": ">="

	},
    {
        "precedence": 8,
        "assocLeft": true,
        "type": "==",
        "match": "=="
    },
    {
        "precedence": 8,
        "assocLeft": true,
        "type": "!=",
        "match": "!="
    },
    {
        "precedence": 7,
        "assocLeft": true,
        "type": "&",
        "match": "&"
    },
    {
        "precedence": 6,
        "assocLeft": true,
        "type": "^",
        "match": "^"
    },
    {
        "precedence": 5,
        "assocLeft": true,
        "type": "|",
        "match": "|"
    },
    {
        "precedence": 4,
        "assocLeft": true,
        "type": "&&",
        "match": "&&"
    },
    {
        "precedence": 3,
        "assocLeft": true,
        "type": "||",
        "match": "||"
    },
	{
		"precedence": 2,
		"assocLeft": false,
		"type": "=",
		"match": "=",
	},
	TOKEN_COMMA
].sort((e, a) => a.match.length - e.match.length);
export const TOKEN_STRING = {
	type: "STRING",
	literal: true,
	match: null, // Needs to be manually parsed
};

export const TOKEN_HEXIDECIMAL = {
	type: "HEXIDECIMAL",
	number: true,
	literal: true,
	match: /^0x[\w]+/
};

export const TOKEN_DECIMAL = {
	type: "DECIMAL",
	number: true,
	literal: true,
	match: /^\d+\.?\d{0,}/
};

export const TOKEN_OCTAL = {
	type: "OCTAL",
	number: true,
	literal: true,
	match: /^0o[\d_]+/
};

export const TOKEN_BINARY = {
	type: "BINARY",
	number: true,
	literal: true,
	match: /^0b[\d_]+/
};

export const TOKEN_BOOL = {
	type: "BOOL",
	literal: true,
	match: /^true|^false/
};
export const TOKEN_LITERALS = [
	TOKEN_STRING,
	TOKEN_HEXIDECIMAL,
	TOKEN_OCTAL,
	TOKEN_BINARY,
	TOKEN_DECIMAL,
	TOKEN_BOOL
]; 

export const TOKEN_IDENTIFIER = {
	type: "IDENTIFIER",
	match: /^[a-zA-Z][a-zA-Z0-9]{0,}/
};

export const TOKEN_FUNCTION = {
	type: "FUNCTION",
};

export const TOKEN_EMPTY = {
	type: "EMPTY",
};

export const TOKEN_INVALID = {
	type: "INVALID"
};


export const TOKEN_TYPES = TOKEN_OPERATORS
							.concat(TOKEN_LITERALS,
									[TOKEN_IDENTIFIER]);


export function makeToken(tokenType, index = 0, value = null) {
	let tokenSample;
	if (tokenType == "EMPTY") {
		tokenSample = TOKEN_EMPTY;
	} else if(tokenType == "INVALID") {
		tokenSample = TOKEN_INVALID;
	} else if (tokenType == "FUNCTION") {
		tokenSample = TOKEN_FUNCTION;
	} else {
		const tokenMatches = TOKEN_TYPES.filter((e) => e.type == tokenType);
		if (tokenMatches.length) {
			tokenSample = tokenMatches.pop();
		} else {
			throw Error("Can not find token " + tokenType);
		}
	}
	const cloneToken = Object.assign({}, tokenSample);
	if (value != null) {
		cloneToken.value = value;
	} else if (typeof tokenSample.match == "string") {
		cloneToken.value = tokenSample.match;
	}
	cloneToken.index = index;
	return cloneToken;
}

export function isOpenToken(tokenChar) {
	return tokenChar == '(' || tokenChar == '[';
}

export function isCloseToken(tokenChar) {
	return tokenChar == ')' || tokenChar == ']'; 
}

export function closeTokenMatch(openTokenChar) {
	if (openTokenChar == '(') 
		return ')';
	if (openTokenChar == '[')
		return ']';
	return '';
}

export function openTokenMatch(closeTokenChar) {
	if (closeTokenChar == ')') 
		return '(';
	if (closeTokenChar == ']')
		return '[';
	return '';
}

export function isAssignmentToken(tokenChar) {
	if (tokenChar == null) {
		return false;
	}
	return tokenChar == '=';
}
