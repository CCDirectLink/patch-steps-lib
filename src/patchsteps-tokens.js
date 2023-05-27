export const TOKEN_TYPES = [{
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
        "precedence": 1,
        "assocLeft": true,
        "type": ",",
        "match": ","
    }
].sort((e, a) => a.type.length - e.type.length);
