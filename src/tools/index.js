"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanners = void 0;
const python_1 = require("./python");
const node_1 = require("./node");
const bun_1 = require("./bun");
const rust_1 = require("./rust");
const git_1 = require("./git");
const vscode_1 = require("./vscode");
const android_1 = require("./android");
const types_1 = require("../types");
exports.scanners = [
    new python_1.PythonScanner(),
    new node_1.NodeScanner(),
    new bun_1.BunScanner(),
    new rust_1.RustScanner(),
    new git_1.GitScanner(),
    new vscode_1.VSCodeScanner(),
    new android_1.AndroidScanner()
];
//# sourceMappingURL=index.js.map