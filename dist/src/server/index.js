"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const server_1 = require("../util/server");
const server_2 = require("./server");
// start server
(0, server_2.startServer)((0, constants_1.getDefaultPort)(), server_1.BrowserBehavior.SKIP);
//# sourceMappingURL=index.js.map