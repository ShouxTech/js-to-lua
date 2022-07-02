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
    static writeLiteral(node) {
        return node.raw;
    }

    static writeVariableDeclaration(node) {
        let res = '';

        const declarations = node.declarations;

        for (const declaration of declarations) {
            const name = declaration.id.name;
            const init = declaration.init;

            res += `local ${name} = `;

            if (init.type === 'Literal') {
                res += `${Transpiler.writeLiteral(init)};\n`;
            } else if (init.type === 'BinaryExpression') {
                res += `${Transpiler.writeBinaryExpression(init)};\n`;
            } else if (init.type === 'LogicalExpression') {
                res += `${Transpiler.writeLogicalExpression(init)};\n`;
            } else if (init.type === 'ArrayExpression') {
                res += `${Transpiler.writeArrayExpression(init)};\n`;
            } else if (init.type === 'ObjectExpression') {
                res += `${Transpiler.writeObjectExpression(init)};\n`;
            } else if (init.type === 'Identifier') {
                res += `${init.name};\n`;
            }
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

    static writeIfStatement(node) {
        let res = '';

        const test = node.test;
        const consequent = node.consequent;
        const alternate = node.alternate;

        res += 'if ';

        if (test.type === 'Literal') {
            res += Transpiler.writeLiteral(test);
        } else if (test.type === 'BinaryExpression') {
            res += Transpiler.writeBinaryExpression(test);
        } else if (test.type === 'LogicalExpression') {
            res += Transpiler.writeLogicalExpression(test);
        } else if (test.type === 'Identifier') {
            res += test.name;
        }

        res += ' then\n';

        res += Transpiler.writeBody(consequent.body);

        if (alternate) {
            res += 'else\n';
            res += Transpiler.writeBody(alternate.body);
        }

        return res + 'end;\n';
    }

    static writeForStatement(node) {
        // TODO: make it work
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

        if (right.type === 'Literal') {
            res += Transpiler.writeLiteral(right);
        }

        return res;
    }

    static writeBinaryExpression(node) {
        let res = '';

        const left = node.left;
        const right = node.right;

        if (left.type === 'Literal') {
            res += Transpiler.writeLiteral(left);
        } else if (left.type === 'Identifier') {
            res += left.name;
        }

        if (node.operator === '==' || node.operator === '===') {
            res += ' == ';
        } else if (node.operator === '!=' || node.operator === '!==') {
            res += ' ~= ';
        } else {
            res += ` ${node.operator} `;
        }

        if (right.type === 'Literal') {
            res += Transpiler.writeLiteral(right);
        } else if (right.type === 'Identifier') {
            res += right.name;
        }

        return res;
    }

    static writeMemberExpression(node) {
        let res = '';

        const object = node.object;
        const property = node.property;

        if (object.type === 'Literal') {
            res += Transpiler.writeLiteral(object);
        } else if (object.type === 'Identifier') {
            res += object.name;
        }

        res += '.';

        if (property.type === 'Literal') {
            res += Transpiler.writeLiteral(property);
        } else if (property.type === 'Identifier') {
            res += property.name;
        }

        return res;
    }

    static writeCallExpression(node) {
        let res = '';

        const callee = node.callee;
        const args = node.arguments;

        if (callee.type === 'Identifier') {
            res += `${callee.name}(`;
        } else if (callee.type === 'MemberExpression') {
            res += `${Transpiler.writeMemberExpression(callee)}(`;
        }

        for (const arg of args) {
            if (arg.type === 'Literal') {
                res += Transpiler.writeLiteral(arg);
            } else if (arg.type === 'Identifier') {
                res += arg.name;
            }
            res += ', ';
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

        if (left.type === 'Literal') {
            res += Transpiler.writeLiteral(left);
        } else if (left.type === 'BinaryExpression') {
            res += Transpiler.writeBinaryExpression(left);
        } else if (left.type === 'Identifier') {
            res += left.name;
        }

        if (node.operator === '&&') {
            res += ' and ';
        } else if (node.operator === '||') {
            res += ' or ';
        }

        if (right.type === 'Literal') {
            res += Transpiler.writeLiteral(right);
        } else if (right.type === 'BinaryExpression') {
            res += Transpiler.writeBinaryExpression(right);
        } else if (right.type === 'Identifier') {
            res += right.name;
        }

        return res;
    }

    static writeArrayExpression(node) {
        let res = '';

        res += '{';

        for (const element of node.elements) {
            if (element.type === 'Literal') {
                res += Transpiler.writeLiteral(element);
            } else if (element.type === 'ObjectExpression') {
                res += Transpiler.writeObjectExpression(element);
            } else if (element.type === 'Identifier') {
                res += element.name;
            }
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
                if (property.value.type === 'Literal') {
                    res += Transpiler.writeLiteral(property.value);
                } else if (property.value.type === 'ArrayExpression') {
                    res += Transpiler.writeArrayExpression(property.value);
                } else if (property.value.type === 'Identifier') {
                    res += property.value.name;
                }
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

        if (argument.type === 'Literal') {
            res += Transpiler.writeLiteral(argument);
        } else if (argument.type === 'Identifier') {
            res += argument.name;
        }

        if (node.operator === '++') {
            res += ` = ${res} + 1`;
        } else if (node.operator === '--') {
            res += ` = ${res} - 1`;
        }

        return res;
    }

    static writeExpressionStatement(node) {
        let res = '';

        const expression = node.expression;

        if (expression.type === 'AssignmentExpression') {
            res += Transpiler.writeAssignmentExpression(expression);
        } else if (expression.type === 'BinaryExpression') {
            res += Transpiler.writeBinaryExpression(expression);
        } else if (expression.type === 'CallExpression') {
            res += Transpiler.writeCallExpression(expression);
        } else if (expression.type === 'LogicalExpression') {
            res += Transpiler.writeLogicalExpression(expression);
        } else if (expression.type === 'ArrayExpression') {
            res += Transpiler.writeArrayExpression(expression);
        } else if (expression.type === 'ObjectExpression') {
            res += Transpiler.writeObjectExpression(expression);
        } else if (expression.type === 'UpdateExpression') {
            res += Transpiler.writeUpdateExpression(expression);
        }

        return res + ';\n';
    }

    static writeBody(body) {
        let res = '';
    
        for (const node of body) {
            if (node.type === 'VariableDeclaration') {
                res += Transpiler.writeVariableDeclaration(node);
            } else if (node.type === 'BlockStatement') {
                res += Transpiler.writeBlockStatement(node);
            } else if (node.type === 'FunctionDeclaration') {
                res += Transpiler.writeFunctionDeclaration(node);
            } else if (node.type === 'ExpressionStatement') {
                res += Transpiler.writeExpressionStatement(node);
            } else if (node.type === 'IfStatement') {
                res += Transpiler.writeIfStatement(node);
            } else if (node.type === 'ForStatement') {
                res += Transpiler.writeForStatement(node);
            } else if (node.type === 'WhileStatement') {
                res += Transpiler.writeWhileStatement(node);
            }
        }

        return res;
    }

    static write(ast) {
        let res = '';

        res += Transpiler.writeBody(ast.body);
    
        return res;
    }
}

const res = Transpiler.write(ast);

console.log(DO_FORMAT ? luaFmt.formatText(res) : res);