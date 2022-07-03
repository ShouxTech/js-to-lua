const acorn = require('acorn');
const fs = require('fs');
const luaFmt = require('lua-fmt');

const input = fs.readFileSync('input.js');

const DO_FORMAT = true; // Format the outputted Lua code.
const PARSE_OPTIONS = {
    ecmaVersion: 2021,
};

const ast = acorn.parse(input, PARSE_OPTIONS);

class Transpiler {
    static conversions = {
        'Literal': (node) => {
            return node.raw;
        },
        'Identifier': (node) => {
            return node.name;
        },

        'BinaryExpression': Transpiler.writeBinaryExpression,
        'LogicalExpression': Transpiler.writeLogicalExpression,
        'ArrayExpression': Transpiler.writeArrayExpression,
        'ObjectExpression': Transpiler.writeObjectExpression,
        'MemberExpression': Transpiler.writeMemberExpression,
        'AssignmentExpression': Transpiler.writeAssignmentExpression,
        'UnaryExpression': Transpiler.writeUnaryExpression,
        'UpdateExpression': Transpiler.writeUpdateExpression,
        'CallExpression': Transpiler.writeCallExpression,
        'ExpressionStatement': Transpiler.writeExpressionStatement,

        'VariableDeclaration': Transpiler.writeVariableDeclaration,
        'BlockStatement': Transpiler.writeBlockStatement,
        'FunctionDeclaration': Transpiler.writeFunctionDeclaration,
        'IfStatement': Transpiler.writeIfStatement,
        'ForStatement': Transpiler.writeForStatement,
        'WhileStatement': Transpiler.writeWhileStatement,
        'BreakStatement': Transpiler.writeBreakStatement,
        'ContinueStatement': Transpiler.writeContinueStatement,
        'ReturnStatement': Transpiler.writeReturnStatement,
    }

    static convert(node) {
        if (node.type in Transpiler.conversions) {
            return Transpiler.conversions[node.type](node);
        }

        throw new Error(`Unsupported node type: ${node.type}`);
    }

    static writeVariableDeclaration(node) {
        let res = '';

        const declarations = node.declarations;

        for (const declaration of declarations) {
            const name = declaration.id.name;
            const init = declaration.init;

            res += `local ${name} = `;

            res += `${Transpiler.convert(init)};\n`;
        }

        return res;
    }

    static writeBlockStatement(node) {
        let res = 'do\n';
    
        res += Transpiler.writeBody(node.body);

        return res + 'end;\n';
    }

    static writeFunctionDeclaration(node) {
        const name = node.id.name;
        const params = node.params;
        const body = node.body;

        let res = '';

        res += `local function ${name}(`;

        for (const param of params) {
            res += param.name + ', ';
        }

        if (params.length > 0) {
            res = res.slice(0, -2);
        }

        res += ')\n';

        res += Transpiler.writeBody(body.body);

        return res + 'end;\n';
    }

    static writeIfStatement(node, recursive = false) {
        let res = '';

        const test = node.test;
        const consequent = node.consequent;
        const alternate = node.alternate;

        res += 'if ';
        res += Transpiler.convert(test);
        res += ' then\n';

        res += Transpiler.writeBody(consequent.body);

        if (alternate) {
            if (alternate.type === 'IfStatement') {
                res += 'else';
                res += Transpiler.writeIfStatement(alternate, true);
            } else {
                res += 'else\n';
                res += Transpiler.writeBody(alternate.body);
            }
        }

        return res + (recursive ? 'end;\n' : '\n');
    }

    static writeForStatement(node) {
        let res = 'do\n';
    
        res += Transpiler.convert(node.init);

        if (node.update) {
            res += 'local _js_shouldIncrement = false;\n';
        }

        res += 'while ';
        res += Transpiler.convert(node.test) + ' do\n';

        if (node.update) {
            res +=
`if _js_shouldIncrement then
${Transpiler.convert(node.update)}
else
_js_shouldIncrement = true;
end;
if not (${Transpiler.convert(node.test)}) then
break;
end;\n`
        }

        res += Transpiler.writeBody(node.body.body);

        res += 'end;\n';

        return res + 'end;\n';
    }

    static writeWhileStatement(node) {
        let res = '';

        const test = node.test;
        const body = node.body;

        res += 'while ';

        if (test.type === 'Literal') {
            res += Transpiler.writeLiteral(test);
        } else if (test.type === 'BinaryExpression') {
            res += Transpiler.writeBinaryExpression(test);
        } else if (test.type === 'LogicalExpression') {
            res += Transpiler.writeLogicalExpression(test);
        } else if (test.type === 'Identifier') {
            res += test.name;
        }

        res += ' do\n';

        res += Transpiler.writeBody(body.body);

        return res + 'end;\n';
    }

    static writeBreakStatement(node) {
        return 'break;\n';
    }

    static writeContinueStatement(node) {
        return 'continue;\n';
    }

    static writeReturnStatement(node) {
        let res = 'return ';

        if (node.argument) {
            res += Transpiler.convert(node.argument);
        }

        return res + ';\n';
    }

    static writeAssignmentExpression(node) {
        let res = '';

        const left = node.left;
        const right = node.right;

        res += `${left.name}`;

        if (node.operator === '=') {
            res += ' = ';
        } else if (node.operator === '+=') {
            res += ` = ${left.name} + `;
        } else if (node.operator === '-=') {
            res += ` = ${left.name} - `;
        } else if (node.operator === '*=') {
            res += ` = ${left.name} * `;
        } else if (node.operator === '/=') {
            res += ` = ${left.name} / `;
        } else if (node.operator === '%=') {
            res += ` = ${left.name} % `;
        }

        res += Transpiler.convert(right);

        return res;
    }

    static writeBinaryExpression(node) {
        let res = '';

        const left = node.left;
        const right = node.right;

        res += Transpiler.convert(left);

        if (node.operator === '==' || node.operator === '===') {
            res += ' == ';
        } else if (node.operator === '!=' || node.operator === '!==') {
            res += ' ~= ';
        } else {
            res += ` ${node.operator} `;
        }

        res += Transpiler.convert(right);

        return res;
    }

    static writeMemberExpression(node) {
        let res = '';

        const object = node.object;
        const property = node.property;

        res += Transpiler.convert(object);

        res += '.';

        res += Transpiler.convert(property);

        if (res === 'console.log') {
            res = 'print';
        }

        return res;
    }

    static writeCallExpression(node) {
        let res = '';

        const callee = node.callee;
        const args = node.arguments;

        res += `${Transpiler.convert(callee)}(`;

        for (const arg of args) {
            res += `${Transpiler.convert(arg)}, `;
        }

        if (args.length > 0) {
            res = res.slice(0, -2);
        }

        res += ')';

        return res;
    }

    static writeLogicalExpression(node) {
        let res = '';

        const left = node.left;
        const right = node.right;

        res += Transpiler.convert(left);

        if (node.operator === '&&') {
            res += ' and ';
        } else if (node.operator === '||') {
            res += ' or ';
        }

        res += Transpiler.convert(right);

        return res;
    }

    static writeArrayExpression(node) {
        let res = '';

        res += '{';

        for (const element of node.elements) {
            res += Transpiler.convert(element);
            res += ', ';
        }

        if (node.elements.length > 0) {
            res = res.slice(0, -2);
        }

        res += '}';

        return res;
    }

    static writeObjectExpression(node) {
        let res = '';

        res += '{';

        for (const property of node.properties) {
            if (property.type === 'Property') {
                res += `${property.key.name} = `;
                res += Transpiler.convert(property.value);
                res += ', ';
            }
        }

        if (node.properties.length > 0) {
            res = res.slice(0, -2);
        }

        res += '}';

        return res;
    }

    static writeUpdateExpression(node) {
        let res = '';

        const argument = node.argument;

        res += Transpiler.convert(argument);

        if (node.operator === '++') {
            res += ` = ${res} + 1`;
        } else if (node.operator === '--') {
            res += ` = ${res} - 1`;
        }

        return res;
    }

    static writeUnaryExpression(node) {
        let res = '';

        const argument = node.argument;

        if (node.operator === '!') {
            res += 'not ';
        } else {
            res += node.operator;
        }

        res += Transpiler.convert(argument);

        return res;
    }

    static writeExpressionStatement(node) {
        let res = '';

        const expression = node.expression;

        res += Transpiler.convert(expression);

        return res + ';\n';
    }

    static writeBody(body) {
        let res = '';
    
        for (const node of body) {
            res += Transpiler.convert(node);
        }

        return res;
    }

    static transpile(ast) {
        let res = '';

        res += Transpiler.writeBody(ast.body);
    
        return res;
    }
}

const res = Transpiler.transpile(ast);

console.log(DO_FORMAT ? luaFmt.formatText(res) : res);
