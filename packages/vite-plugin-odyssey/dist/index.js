import { createRequire } from "node:module";
import path from "path";
import { fileURLToPath } from "url";

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ createRequire(import.meta.url);

//#endregion
//#region ../../node_modules/.pnpm/universalify@2.0.1/node_modules/universalify/index.js
var require_universalify = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/universalify@2.0.1/node_modules/universalify/index.js": ((exports) => {
	exports.fromCallback = function(fn) {
		return Object.defineProperty(function(...args) {
			if (typeof args[args.length - 1] === "function") fn.apply(this, args);
			else return new Promise((resolve, reject) => {
				args.push((err, res) => err != null ? reject(err) : resolve(res));
				fn.apply(this, args);
			});
		}, "name", { value: fn.name });
	};
	exports.fromPromise = function(fn) {
		return Object.defineProperty(function(...args) {
			const cb = args[args.length - 1];
			if (typeof cb !== "function") return fn.apply(this, args);
			else {
				args.pop();
				fn.apply(this, args).then((r) => cb(null, r), cb);
			}
		}, "name", { value: fn.name });
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/polyfills.js
var require_polyfills = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/polyfills.js": ((exports, module) => {
	var constants = __require("constants");
	var origCwd = process.cwd;
	var cwd = null;
	var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
	process.cwd = function() {
		if (!cwd) cwd = origCwd.call(process);
		return cwd;
	};
	try {
		process.cwd();
	} catch (er) {}
	if (typeof process.chdir === "function") {
		var chdir = process.chdir;
		process.chdir = function(d) {
			cwd = null;
			chdir.call(process, d);
		};
		if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
	}
	module.exports = patch$1;
	function patch$1(fs$20) {
		if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) patchLchmod(fs$20);
		if (!fs$20.lutimes) patchLutimes(fs$20);
		fs$20.chown = chownFix(fs$20.chown);
		fs$20.fchown = chownFix(fs$20.fchown);
		fs$20.lchown = chownFix(fs$20.lchown);
		fs$20.chmod = chmodFix(fs$20.chmod);
		fs$20.fchmod = chmodFix(fs$20.fchmod);
		fs$20.lchmod = chmodFix(fs$20.lchmod);
		fs$20.chownSync = chownFixSync(fs$20.chownSync);
		fs$20.fchownSync = chownFixSync(fs$20.fchownSync);
		fs$20.lchownSync = chownFixSync(fs$20.lchownSync);
		fs$20.chmodSync = chmodFixSync(fs$20.chmodSync);
		fs$20.fchmodSync = chmodFixSync(fs$20.fchmodSync);
		fs$20.lchmodSync = chmodFixSync(fs$20.lchmodSync);
		fs$20.stat = statFix(fs$20.stat);
		fs$20.fstat = statFix(fs$20.fstat);
		fs$20.lstat = statFix(fs$20.lstat);
		fs$20.statSync = statFixSync(fs$20.statSync);
		fs$20.fstatSync = statFixSync(fs$20.fstatSync);
		fs$20.lstatSync = statFixSync(fs$20.lstatSync);
		if (fs$20.chmod && !fs$20.lchmod) {
			fs$20.lchmod = function(path$13, mode, cb) {
				if (cb) process.nextTick(cb);
			};
			fs$20.lchmodSync = function() {};
		}
		if (fs$20.chown && !fs$20.lchown) {
			fs$20.lchown = function(path$13, uid, gid, cb) {
				if (cb) process.nextTick(cb);
			};
			fs$20.lchownSync = function() {};
		}
		if (platform === "win32") fs$20.rename = typeof fs$20.rename !== "function" ? fs$20.rename : (function(fs$rename) {
			function rename$1(from, to, cb) {
				var start = Date.now();
				var backoff = 0;
				fs$rename(from, to, function CB(er) {
					if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
						setTimeout(function() {
							fs$20.stat(to, function(stater, st) {
								if (stater && stater.code === "ENOENT") fs$rename(from, to, CB);
								else cb(er);
							});
						}, backoff);
						if (backoff < 100) backoff += 10;
						return;
					}
					if (cb) cb(er);
				});
			}
			if (Object.setPrototypeOf) Object.setPrototypeOf(rename$1, fs$rename);
			return rename$1;
		})(fs$20.rename);
		fs$20.read = typeof fs$20.read !== "function" ? fs$20.read : (function(fs$read) {
			function read(fd, buffer, offset, length, position, callback_) {
				var callback;
				if (callback_ && typeof callback_ === "function") {
					var eagCounter = 0;
					callback = function(er, _, __) {
						if (er && er.code === "EAGAIN" && eagCounter < 10) {
							eagCounter++;
							return fs$read.call(fs$20, fd, buffer, offset, length, position, callback);
						}
						callback_.apply(this, arguments);
					};
				}
				return fs$read.call(fs$20, fd, buffer, offset, length, position, callback);
			}
			if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
			return read;
		})(fs$20.read);
		fs$20.readSync = typeof fs$20.readSync !== "function" ? fs$20.readSync : (function(fs$readSync) {
			return function(fd, buffer, offset, length, position) {
				var eagCounter = 0;
				while (true) try {
					return fs$readSync.call(fs$20, fd, buffer, offset, length, position);
				} catch (er) {
					if (er.code === "EAGAIN" && eagCounter < 10) {
						eagCounter++;
						continue;
					}
					throw er;
				}
			};
		})(fs$20.readSync);
		function patchLchmod(fs$21) {
			fs$21.lchmod = function(path$13, mode, callback) {
				fs$21.open(path$13, constants.O_WRONLY | constants.O_SYMLINK, mode, function(err, fd) {
					if (err) {
						if (callback) callback(err);
						return;
					}
					fs$21.fchmod(fd, mode, function(err$1) {
						fs$21.close(fd, function(err2) {
							if (callback) callback(err$1 || err2);
						});
					});
				});
			};
			fs$21.lchmodSync = function(path$13, mode) {
				var fd = fs$21.openSync(path$13, constants.O_WRONLY | constants.O_SYMLINK, mode);
				var threw = true;
				var ret;
				try {
					ret = fs$21.fchmodSync(fd, mode);
					threw = false;
				} finally {
					if (threw) try {
						fs$21.closeSync(fd);
					} catch (er) {}
					else fs$21.closeSync(fd);
				}
				return ret;
			};
		}
		function patchLutimes(fs$21) {
			if (constants.hasOwnProperty("O_SYMLINK") && fs$21.futimes) {
				fs$21.lutimes = function(path$13, at, mt, cb) {
					fs$21.open(path$13, constants.O_SYMLINK, function(er, fd) {
						if (er) {
							if (cb) cb(er);
							return;
						}
						fs$21.futimes(fd, at, mt, function(er$1) {
							fs$21.close(fd, function(er2) {
								if (cb) cb(er$1 || er2);
							});
						});
					});
				};
				fs$21.lutimesSync = function(path$13, at, mt) {
					var fd = fs$21.openSync(path$13, constants.O_SYMLINK);
					var ret;
					var threw = true;
					try {
						ret = fs$21.futimesSync(fd, at, mt);
						threw = false;
					} finally {
						if (threw) try {
							fs$21.closeSync(fd);
						} catch (er) {}
						else fs$21.closeSync(fd);
					}
					return ret;
				};
			} else if (fs$21.futimes) {
				fs$21.lutimes = function(_a, _b, _c, cb) {
					if (cb) process.nextTick(cb);
				};
				fs$21.lutimesSync = function() {};
			}
		}
		function chmodFix(orig) {
			if (!orig) return orig;
			return function(target, mode, cb) {
				return orig.call(fs$20, target, mode, function(er) {
					if (chownErOk(er)) er = null;
					if (cb) cb.apply(this, arguments);
				});
			};
		}
		function chmodFixSync(orig) {
			if (!orig) return orig;
			return function(target, mode) {
				try {
					return orig.call(fs$20, target, mode);
				} catch (er) {
					if (!chownErOk(er)) throw er;
				}
			};
		}
		function chownFix(orig) {
			if (!orig) return orig;
			return function(target, uid, gid, cb) {
				return orig.call(fs$20, target, uid, gid, function(er) {
					if (chownErOk(er)) er = null;
					if (cb) cb.apply(this, arguments);
				});
			};
		}
		function chownFixSync(orig) {
			if (!orig) return orig;
			return function(target, uid, gid) {
				try {
					return orig.call(fs$20, target, uid, gid);
				} catch (er) {
					if (!chownErOk(er)) throw er;
				}
			};
		}
		function statFix(orig) {
			if (!orig) return orig;
			return function(target, options, cb) {
				if (typeof options === "function") {
					cb = options;
					options = null;
				}
				function callback(er, stats) {
					if (stats) {
						if (stats.uid < 0) stats.uid += 4294967296;
						if (stats.gid < 0) stats.gid += 4294967296;
					}
					if (cb) cb.apply(this, arguments);
				}
				return options ? orig.call(fs$20, target, options, callback) : orig.call(fs$20, target, callback);
			};
		}
		function statFixSync(orig) {
			if (!orig) return orig;
			return function(target, options) {
				var stats = options ? orig.call(fs$20, target, options) : orig.call(fs$20, target);
				if (stats) {
					if (stats.uid < 0) stats.uid += 4294967296;
					if (stats.gid < 0) stats.gid += 4294967296;
				}
				return stats;
			};
		}
		function chownErOk(er) {
			if (!er) return true;
			if (er.code === "ENOSYS") return true;
			if (!process.getuid || process.getuid() !== 0) {
				if (er.code === "EINVAL" || er.code === "EPERM") return true;
			}
			return false;
		}
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/legacy-streams.js": ((exports, module) => {
	var Stream = __require("stream").Stream;
	module.exports = legacy$1;
	function legacy$1(fs$20) {
		return {
			ReadStream,
			WriteStream
		};
		function ReadStream(path$13, options) {
			if (!(this instanceof ReadStream)) return new ReadStream(path$13, options);
			Stream.call(this);
			var self = this;
			this.path = path$13;
			this.fd = null;
			this.readable = true;
			this.paused = false;
			this.flags = "r";
			this.mode = 438;
			this.bufferSize = 64 * 1024;
			options = options || {};
			var keys = Object.keys(options);
			for (var index = 0, length = keys.length; index < length; index++) {
				var key = keys[index];
				this[key] = options[key];
			}
			if (this.encoding) this.setEncoding(this.encoding);
			if (this.start !== void 0) {
				if ("number" !== typeof this.start) throw TypeError("start must be a Number");
				if (this.end === void 0) this.end = Infinity;
				else if ("number" !== typeof this.end) throw TypeError("end must be a Number");
				if (this.start > this.end) throw new Error("start must be <= end");
				this.pos = this.start;
			}
			if (this.fd !== null) {
				process.nextTick(function() {
					self._read();
				});
				return;
			}
			fs$20.open(this.path, this.flags, this.mode, function(err, fd) {
				if (err) {
					self.emit("error", err);
					self.readable = false;
					return;
				}
				self.fd = fd;
				self.emit("open", fd);
				self._read();
			});
		}
		function WriteStream(path$13, options) {
			if (!(this instanceof WriteStream)) return new WriteStream(path$13, options);
			Stream.call(this);
			this.path = path$13;
			this.fd = null;
			this.writable = true;
			this.flags = "w";
			this.encoding = "binary";
			this.mode = 438;
			this.bytesWritten = 0;
			options = options || {};
			var keys = Object.keys(options);
			for (var index = 0, length = keys.length; index < length; index++) {
				var key = keys[index];
				this[key] = options[key];
			}
			if (this.start !== void 0) {
				if ("number" !== typeof this.start) throw TypeError("start must be a Number");
				if (this.start < 0) throw new Error("start must be >= zero");
				this.pos = this.start;
			}
			this.busy = false;
			this._queue = [];
			if (this.fd === null) {
				this._open = fs$20.open;
				this._queue.push([
					this._open,
					this.path,
					this.flags,
					this.mode,
					void 0
				]);
				this.flush();
			}
		}
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/clone.js
var require_clone = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/clone.js": ((exports, module) => {
	module.exports = clone$1;
	var getPrototypeOf = Object.getPrototypeOf || function(obj) {
		return obj.__proto__;
	};
	function clone$1(obj) {
		if (obj === null || typeof obj !== "object") return obj;
		if (obj instanceof Object) var copy$2 = { __proto__: getPrototypeOf(obj) };
		else var copy$2 = Object.create(null);
		Object.getOwnPropertyNames(obj).forEach(function(key) {
			Object.defineProperty(copy$2, key, Object.getOwnPropertyDescriptor(obj, key));
		});
		return copy$2;
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/graceful-fs.js": ((exports, module) => {
	var fs$19 = __require("fs");
	var polyfills = require_polyfills();
	var legacy = require_legacy_streams();
	var clone = require_clone();
	var util = __require("util");
	/* istanbul ignore next - node 0.x polyfill */
	var gracefulQueue;
	var previousSymbol;
	/* istanbul ignore else - node 0.x polyfill */
	if (typeof Symbol === "function" && typeof Symbol.for === "function") {
		gracefulQueue = Symbol.for("graceful-fs.queue");
		previousSymbol = Symbol.for("graceful-fs.previous");
	} else {
		gracefulQueue = "___graceful-fs.queue";
		previousSymbol = "___graceful-fs.previous";
	}
	function noop() {}
	function publishQueue(context, queue) {
		Object.defineProperty(context, gracefulQueue, { get: function() {
			return queue;
		} });
	}
	var debug = noop;
	if (util.debuglog) debug = util.debuglog("gfs4");
	else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) debug = function() {
		var m = util.format.apply(util, arguments);
		m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
		console.error(m);
	};
	if (!fs$19[gracefulQueue]) {
		publishQueue(fs$19, global[gracefulQueue] || []);
		fs$19.close = (function(fs$close) {
			function close(fd, cb) {
				return fs$close.call(fs$19, fd, function(err) {
					if (!err) resetQueue();
					if (typeof cb === "function") cb.apply(this, arguments);
				});
			}
			Object.defineProperty(close, previousSymbol, { value: fs$close });
			return close;
		})(fs$19.close);
		fs$19.closeSync = (function(fs$closeSync) {
			function closeSync(fd) {
				fs$closeSync.apply(fs$19, arguments);
				resetQueue();
			}
			Object.defineProperty(closeSync, previousSymbol, { value: fs$closeSync });
			return closeSync;
		})(fs$19.closeSync);
		if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) process.on("exit", function() {
			debug(fs$19[gracefulQueue]);
			__require("assert").equal(fs$19[gracefulQueue].length, 0);
		});
	}
	if (!global[gracefulQueue]) publishQueue(global, fs$19[gracefulQueue]);
	module.exports = patch(clone(fs$19));
	if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$19.__patched) {
		module.exports = patch(fs$19);
		fs$19.__patched = true;
	}
	function patch(fs$20) {
		polyfills(fs$20);
		fs$20.gracefulify = patch;
		fs$20.createReadStream = createReadStream;
		fs$20.createWriteStream = createWriteStream;
		var fs$readFile = fs$20.readFile;
		fs$20.readFile = readFile$1;
		function readFile$1(path$13, options, cb) {
			if (typeof options === "function") cb = options, options = null;
			return go$readFile(path$13, options, cb);
			function go$readFile(path$14, options$1, cb$1, startTime) {
				return fs$readFile(path$14, options$1, function(err) {
					if (err && (err.code === "EMFILE" || err.code === "ENFILE")) enqueue([
						go$readFile,
						[
							path$14,
							options$1,
							cb$1
						],
						err,
						startTime || Date.now(),
						Date.now()
					]);
					else if (typeof cb$1 === "function") cb$1.apply(this, arguments);
				});
			}
		}
		var fs$writeFile = fs$20.writeFile;
		fs$20.writeFile = writeFile$1;
		function writeFile$1(path$13, data, options, cb) {
			if (typeof options === "function") cb = options, options = null;
			return go$writeFile(path$13, data, options, cb);
			function go$writeFile(path$14, data$1, options$1, cb$1, startTime) {
				return fs$writeFile(path$14, data$1, options$1, function(err) {
					if (err && (err.code === "EMFILE" || err.code === "ENFILE")) enqueue([
						go$writeFile,
						[
							path$14,
							data$1,
							options$1,
							cb$1
						],
						err,
						startTime || Date.now(),
						Date.now()
					]);
					else if (typeof cb$1 === "function") cb$1.apply(this, arguments);
				});
			}
		}
		var fs$appendFile = fs$20.appendFile;
		if (fs$appendFile) fs$20.appendFile = appendFile;
		function appendFile(path$13, data, options, cb) {
			if (typeof options === "function") cb = options, options = null;
			return go$appendFile(path$13, data, options, cb);
			function go$appendFile(path$14, data$1, options$1, cb$1, startTime) {
				return fs$appendFile(path$14, data$1, options$1, function(err) {
					if (err && (err.code === "EMFILE" || err.code === "ENFILE")) enqueue([
						go$appendFile,
						[
							path$14,
							data$1,
							options$1,
							cb$1
						],
						err,
						startTime || Date.now(),
						Date.now()
					]);
					else if (typeof cb$1 === "function") cb$1.apply(this, arguments);
				});
			}
		}
		var fs$copyFile = fs$20.copyFile;
		if (fs$copyFile) fs$20.copyFile = copyFile$2;
		function copyFile$2(src, dest, flags, cb) {
			if (typeof flags === "function") {
				cb = flags;
				flags = 0;
			}
			return go$copyFile(src, dest, flags, cb);
			function go$copyFile(src$1, dest$1, flags$1, cb$1, startTime) {
				return fs$copyFile(src$1, dest$1, flags$1, function(err) {
					if (err && (err.code === "EMFILE" || err.code === "ENFILE")) enqueue([
						go$copyFile,
						[
							src$1,
							dest$1,
							flags$1,
							cb$1
						],
						err,
						startTime || Date.now(),
						Date.now()
					]);
					else if (typeof cb$1 === "function") cb$1.apply(this, arguments);
				});
			}
		}
		var fs$readdir = fs$20.readdir;
		fs$20.readdir = readdir;
		var noReaddirOptionVersions = /^v[0-5]\./;
		function readdir(path$13, options, cb) {
			if (typeof options === "function") cb = options, options = null;
			var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir$1(path$14, options$1, cb$1, startTime) {
				return fs$readdir(path$14, fs$readdirCallback(path$14, options$1, cb$1, startTime));
			} : function go$readdir$1(path$14, options$1, cb$1, startTime) {
				return fs$readdir(path$14, options$1, fs$readdirCallback(path$14, options$1, cb$1, startTime));
			};
			return go$readdir(path$13, options, cb);
			function fs$readdirCallback(path$14, options$1, cb$1, startTime) {
				return function(err, files) {
					if (err && (err.code === "EMFILE" || err.code === "ENFILE")) enqueue([
						go$readdir,
						[
							path$14,
							options$1,
							cb$1
						],
						err,
						startTime || Date.now(),
						Date.now()
					]);
					else {
						if (files && files.sort) files.sort();
						if (typeof cb$1 === "function") cb$1.call(this, err, files);
					}
				};
			}
		}
		if (process.version.substr(0, 4) === "v0.8") {
			var legStreams = legacy(fs$20);
			ReadStream = legStreams.ReadStream;
			WriteStream = legStreams.WriteStream;
		}
		var fs$ReadStream = fs$20.ReadStream;
		if (fs$ReadStream) {
			ReadStream.prototype = Object.create(fs$ReadStream.prototype);
			ReadStream.prototype.open = ReadStream$open;
		}
		var fs$WriteStream = fs$20.WriteStream;
		if (fs$WriteStream) {
			WriteStream.prototype = Object.create(fs$WriteStream.prototype);
			WriteStream.prototype.open = WriteStream$open;
		}
		Object.defineProperty(fs$20, "ReadStream", {
			get: function() {
				return ReadStream;
			},
			set: function(val) {
				ReadStream = val;
			},
			enumerable: true,
			configurable: true
		});
		Object.defineProperty(fs$20, "WriteStream", {
			get: function() {
				return WriteStream;
			},
			set: function(val) {
				WriteStream = val;
			},
			enumerable: true,
			configurable: true
		});
		var FileReadStream = ReadStream;
		Object.defineProperty(fs$20, "FileReadStream", {
			get: function() {
				return FileReadStream;
			},
			set: function(val) {
				FileReadStream = val;
			},
			enumerable: true,
			configurable: true
		});
		var FileWriteStream = WriteStream;
		Object.defineProperty(fs$20, "FileWriteStream", {
			get: function() {
				return FileWriteStream;
			},
			set: function(val) {
				FileWriteStream = val;
			},
			enumerable: true,
			configurable: true
		});
		function ReadStream(path$13, options) {
			if (this instanceof ReadStream) return fs$ReadStream.apply(this, arguments), this;
			else return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
		}
		function ReadStream$open() {
			var that = this;
			open(that.path, that.flags, that.mode, function(err, fd) {
				if (err) {
					if (that.autoClose) that.destroy();
					that.emit("error", err);
				} else {
					that.fd = fd;
					that.emit("open", fd);
					that.read();
				}
			});
		}
		function WriteStream(path$13, options) {
			if (this instanceof WriteStream) return fs$WriteStream.apply(this, arguments), this;
			else return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
		}
		function WriteStream$open() {
			var that = this;
			open(that.path, that.flags, that.mode, function(err, fd) {
				if (err) {
					that.destroy();
					that.emit("error", err);
				} else {
					that.fd = fd;
					that.emit("open", fd);
				}
			});
		}
		function createReadStream(path$13, options) {
			return new fs$20.ReadStream(path$13, options);
		}
		function createWriteStream(path$13, options) {
			return new fs$20.WriteStream(path$13, options);
		}
		var fs$open = fs$20.open;
		fs$20.open = open;
		function open(path$13, flags, mode, cb) {
			if (typeof mode === "function") cb = mode, mode = null;
			return go$open(path$13, flags, mode, cb);
			function go$open(path$14, flags$1, mode$1, cb$1, startTime) {
				return fs$open(path$14, flags$1, mode$1, function(err, fd) {
					if (err && (err.code === "EMFILE" || err.code === "ENFILE")) enqueue([
						go$open,
						[
							path$14,
							flags$1,
							mode$1,
							cb$1
						],
						err,
						startTime || Date.now(),
						Date.now()
					]);
					else if (typeof cb$1 === "function") cb$1.apply(this, arguments);
				});
			}
		}
		return fs$20;
	}
	function enqueue(elem) {
		debug("ENQUEUE", elem[0].name, elem[1]);
		fs$19[gracefulQueue].push(elem);
		retry();
	}
	var retryTimer;
	function resetQueue() {
		var now = Date.now();
		for (var i = 0; i < fs$19[gracefulQueue].length; ++i) if (fs$19[gracefulQueue][i].length > 2) {
			fs$19[gracefulQueue][i][3] = now;
			fs$19[gracefulQueue][i][4] = now;
		}
		retry();
	}
	function retry() {
		clearTimeout(retryTimer);
		retryTimer = void 0;
		if (fs$19[gracefulQueue].length === 0) return;
		var elem = fs$19[gracefulQueue].shift();
		var fn = elem[0];
		var args = elem[1];
		var err = elem[2];
		var startTime = elem[3];
		var lastTime = elem[4];
		if (startTime === void 0) {
			debug("RETRY", fn.name, args);
			fn.apply(null, args);
		} else if (Date.now() - startTime >= 6e4) {
			debug("TIMEOUT", fn.name, args);
			var cb = args.pop();
			if (typeof cb === "function") cb.call(null, err);
		} else {
			var sinceAttempt = Date.now() - lastTime;
			var sinceStart = Math.max(lastTime - startTime, 1);
			if (sinceAttempt >= Math.min(sinceStart * 1.2, 100)) {
				debug("RETRY", fn.name, args);
				fn.apply(null, args.concat([startTime]));
			} else fs$19[gracefulQueue].push(elem);
		}
		if (retryTimer === void 0) retryTimer = setTimeout(retry, 0);
	}
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/fs/index.js
var require_fs = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/fs/index.js": ((exports) => {
	const u$15 = require_universalify().fromCallback;
	const fs$18 = require_graceful_fs();
	const api = [
		"access",
		"appendFile",
		"chmod",
		"chown",
		"close",
		"copyFile",
		"cp",
		"fchmod",
		"fchown",
		"fdatasync",
		"fstat",
		"fsync",
		"ftruncate",
		"futimes",
		"glob",
		"lchmod",
		"lchown",
		"lutimes",
		"link",
		"lstat",
		"mkdir",
		"mkdtemp",
		"open",
		"opendir",
		"readdir",
		"readFile",
		"readlink",
		"realpath",
		"rename",
		"rm",
		"rmdir",
		"stat",
		"statfs",
		"symlink",
		"truncate",
		"unlink",
		"utimes",
		"writeFile"
	].filter((key) => {
		return typeof fs$18[key] === "function";
	});
	Object.assign(exports, fs$18);
	api.forEach((method) => {
		exports[method] = u$15(fs$18[method]);
	});
	exports.exists = function(filename, callback) {
		if (typeof callback === "function") return fs$18.exists(filename, callback);
		return new Promise((resolve) => {
			return fs$18.exists(filename, resolve);
		});
	};
	exports.read = function(fd, buffer, offset, length, position, callback) {
		if (typeof callback === "function") return fs$18.read(fd, buffer, offset, length, position, callback);
		return new Promise((resolve, reject) => {
			fs$18.read(fd, buffer, offset, length, position, (err, bytesRead, buffer$1) => {
				if (err) return reject(err);
				resolve({
					bytesRead,
					buffer: buffer$1
				});
			});
		});
	};
	exports.write = function(fd, buffer, ...args) {
		if (typeof args[args.length - 1] === "function") return fs$18.write(fd, buffer, ...args);
		return new Promise((resolve, reject) => {
			fs$18.write(fd, buffer, ...args, (err, bytesWritten, buffer$1) => {
				if (err) return reject(err);
				resolve({
					bytesWritten,
					buffer: buffer$1
				});
			});
		});
	};
	exports.readv = function(fd, buffers, ...args) {
		if (typeof args[args.length - 1] === "function") return fs$18.readv(fd, buffers, ...args);
		return new Promise((resolve, reject) => {
			fs$18.readv(fd, buffers, ...args, (err, bytesRead, buffers$1) => {
				if (err) return reject(err);
				resolve({
					bytesRead,
					buffers: buffers$1
				});
			});
		});
	};
	exports.writev = function(fd, buffers, ...args) {
		if (typeof args[args.length - 1] === "function") return fs$18.writev(fd, buffers, ...args);
		return new Promise((resolve, reject) => {
			fs$18.writev(fd, buffers, ...args, (err, bytesWritten, buffers$1) => {
				if (err) return reject(err);
				resolve({
					bytesWritten,
					buffers: buffers$1
				});
			});
		});
	};
	if (typeof fs$18.realpath.native === "function") exports.realpath.native = u$15(fs$18.realpath.native);
	else process.emitWarning("fs.realpath.native is not a function. Is fs being monkey-patched?", "Warning", "fs-extra-WARN0003");
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/mkdirs/utils.js
var require_utils$1 = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/mkdirs/utils.js": ((exports, module) => {
	const path$12 = __require("path");
	module.exports.checkPath = function checkPath$1(pth) {
		if (process.platform === "win32") {
			if (/[<>:"|?*]/.test(pth.replace(path$12.parse(pth).root, ""))) {
				const error = /* @__PURE__ */ new Error(`Path contains invalid characters: ${pth}`);
				error.code = "EINVAL";
				throw error;
			}
		}
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/mkdirs/make-dir.js
var require_make_dir = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/mkdirs/make-dir.js": ((exports, module) => {
	const fs$17 = require_fs();
	const { checkPath } = require_utils$1();
	const getMode = (options) => {
		const defaults = { mode: 511 };
		if (typeof options === "number") return options;
		return {
			...defaults,
			...options
		}.mode;
	};
	module.exports.makeDir = async (dir, options) => {
		checkPath(dir);
		return fs$17.mkdir(dir, {
			mode: getMode(options),
			recursive: true
		});
	};
	module.exports.makeDirSync = (dir, options) => {
		checkPath(dir);
		return fs$17.mkdirSync(dir, {
			mode: getMode(options),
			recursive: true
		});
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/mkdirs/index.js": ((exports, module) => {
	const u$14 = require_universalify().fromPromise;
	const { makeDir: _makeDir, makeDirSync } = require_make_dir();
	const makeDir = u$14(_makeDir);
	module.exports = {
		mkdirs: makeDir,
		mkdirsSync: makeDirSync,
		mkdirp: makeDir,
		mkdirpSync: makeDirSync,
		ensureDir: makeDir,
		ensureDirSync: makeDirSync
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/path-exists/index.js": ((exports, module) => {
	const u$13 = require_universalify().fromPromise;
	const fs$16 = require_fs();
	function pathExists$6(path$13) {
		return fs$16.access(path$13).then(() => true).catch(() => false);
	}
	module.exports = {
		pathExists: u$13(pathExists$6),
		pathExistsSync: fs$16.existsSync
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/util/utimes.js
var require_utimes = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/util/utimes.js": ((exports, module) => {
	const fs$15 = require_fs();
	const u$12 = require_universalify().fromPromise;
	async function utimesMillis$1(path$13, atime, mtime) {
		const fd = await fs$15.open(path$13, "r+");
		let closeErr = null;
		try {
			await fs$15.futimes(fd, atime, mtime);
		} finally {
			try {
				await fs$15.close(fd);
			} catch (e) {
				closeErr = e;
			}
		}
		if (closeErr) throw closeErr;
	}
	function utimesMillisSync$1(path$13, atime, mtime) {
		const fd = fs$15.openSync(path$13, "r+");
		fs$15.futimesSync(fd, atime, mtime);
		return fs$15.closeSync(fd);
	}
	module.exports = {
		utimesMillis: u$12(utimesMillis$1),
		utimesMillisSync: utimesMillisSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/util/stat.js
var require_stat = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/util/stat.js": ((exports, module) => {
	const fs$14 = require_fs();
	const path$11 = __require("path");
	const u$11 = require_universalify().fromPromise;
	function getStats$1(src, dest, opts) {
		const statFunc = opts.dereference ? (file) => fs$14.stat(file, { bigint: true }) : (file) => fs$14.lstat(file, { bigint: true });
		return Promise.all([statFunc(src), statFunc(dest).catch((err) => {
			if (err.code === "ENOENT") return null;
			throw err;
		})]).then(([srcStat, destStat]) => ({
			srcStat,
			destStat
		}));
	}
	function getStatsSync(src, dest, opts) {
		let destStat;
		const statFunc = opts.dereference ? (file) => fs$14.statSync(file, { bigint: true }) : (file) => fs$14.lstatSync(file, { bigint: true });
		const srcStat = statFunc(src);
		try {
			destStat = statFunc(dest);
		} catch (err) {
			if (err.code === "ENOENT") return {
				srcStat,
				destStat: null
			};
			throw err;
		}
		return {
			srcStat,
			destStat
		};
	}
	async function checkPaths(src, dest, funcName, opts) {
		const { srcStat, destStat } = await getStats$1(src, dest, opts);
		if (destStat) {
			if (areIdentical$2(srcStat, destStat)) {
				const srcBaseName = path$11.basename(src);
				const destBaseName = path$11.basename(dest);
				if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) return {
					srcStat,
					destStat,
					isChangingCase: true
				};
				throw new Error("Source and destination must not be the same.");
			}
			if (srcStat.isDirectory() && !destStat.isDirectory()) throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
			if (!srcStat.isDirectory() && destStat.isDirectory()) throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
		}
		if (srcStat.isDirectory() && isSrcSubdir(src, dest)) throw new Error(errMsg(src, dest, funcName));
		return {
			srcStat,
			destStat
		};
	}
	function checkPathsSync(src, dest, funcName, opts) {
		const { srcStat, destStat } = getStatsSync(src, dest, opts);
		if (destStat) {
			if (areIdentical$2(srcStat, destStat)) {
				const srcBaseName = path$11.basename(src);
				const destBaseName = path$11.basename(dest);
				if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) return {
					srcStat,
					destStat,
					isChangingCase: true
				};
				throw new Error("Source and destination must not be the same.");
			}
			if (srcStat.isDirectory() && !destStat.isDirectory()) throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
			if (!srcStat.isDirectory() && destStat.isDirectory()) throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
		}
		if (srcStat.isDirectory() && isSrcSubdir(src, dest)) throw new Error(errMsg(src, dest, funcName));
		return {
			srcStat,
			destStat
		};
	}
	async function checkParentPaths(src, srcStat, dest, funcName) {
		const srcParent = path$11.resolve(path$11.dirname(src));
		const destParent = path$11.resolve(path$11.dirname(dest));
		if (destParent === srcParent || destParent === path$11.parse(destParent).root) return;
		let destStat;
		try {
			destStat = await fs$14.stat(destParent, { bigint: true });
		} catch (err) {
			if (err.code === "ENOENT") return;
			throw err;
		}
		if (areIdentical$2(srcStat, destStat)) throw new Error(errMsg(src, dest, funcName));
		return checkParentPaths(src, srcStat, destParent, funcName);
	}
	function checkParentPathsSync(src, srcStat, dest, funcName) {
		const srcParent = path$11.resolve(path$11.dirname(src));
		const destParent = path$11.resolve(path$11.dirname(dest));
		if (destParent === srcParent || destParent === path$11.parse(destParent).root) return;
		let destStat;
		try {
			destStat = fs$14.statSync(destParent, { bigint: true });
		} catch (err) {
			if (err.code === "ENOENT") return;
			throw err;
		}
		if (areIdentical$2(srcStat, destStat)) throw new Error(errMsg(src, dest, funcName));
		return checkParentPathsSync(src, srcStat, destParent, funcName);
	}
	function areIdentical$2(srcStat, destStat) {
		return destStat.ino !== void 0 && destStat.dev !== void 0 && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
	}
	function isSrcSubdir(src, dest) {
		const srcArr = path$11.resolve(src).split(path$11.sep).filter((i) => i);
		const destArr = path$11.resolve(dest).split(path$11.sep).filter((i) => i);
		return srcArr.every((cur, i) => destArr[i] === cur);
	}
	function errMsg(src, dest, funcName) {
		return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
	}
	module.exports = {
		checkPaths: u$11(checkPaths),
		checkPathsSync,
		checkParentPaths: u$11(checkParentPaths),
		checkParentPathsSync,
		isSrcSubdir,
		areIdentical: areIdentical$2
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/util/async.js
var require_async = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/util/async.js": ((exports, module) => {
	async function asyncIteratorConcurrentProcess$1(iterator, fn) {
		const promises = [];
		for await (const item of iterator) promises.push(fn(item).then(() => null, (err) => err ?? /* @__PURE__ */ new Error("unknown error")));
		await Promise.all(promises.map((promise) => promise.then((possibleErr) => {
			if (possibleErr !== null) throw possibleErr;
		})));
	}
	module.exports = { asyncIteratorConcurrentProcess: asyncIteratorConcurrentProcess$1 };
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/copy/copy.js
var require_copy$1 = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/copy/copy.js": ((exports, module) => {
	const fs$13 = require_fs();
	const path$10 = __require("path");
	const { mkdirs: mkdirs$1 } = require_mkdirs();
	const { pathExists: pathExists$5 } = require_path_exists();
	const { utimesMillis } = require_utimes();
	const stat$3 = require_stat();
	const { asyncIteratorConcurrentProcess } = require_async();
	async function copy$1(src, dest, opts = {}) {
		if (typeof opts === "function") opts = { filter: opts };
		opts.clobber = "clobber" in opts ? !!opts.clobber : true;
		opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
		if (opts.preserveTimestamps && process.arch === "ia32") process.emitWarning("Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269", "Warning", "fs-extra-WARN0001");
		const { srcStat, destStat } = await stat$3.checkPaths(src, dest, "copy", opts);
		await stat$3.checkParentPaths(src, srcStat, dest, "copy");
		if (!await runFilter(src, dest, opts)) return;
		const destParent = path$10.dirname(dest);
		if (!await pathExists$5(destParent)) await mkdirs$1(destParent);
		await getStatsAndPerformCopy(destStat, src, dest, opts);
	}
	async function runFilter(src, dest, opts) {
		if (!opts.filter) return true;
		return opts.filter(src, dest);
	}
	async function getStatsAndPerformCopy(destStat, src, dest, opts) {
		const srcStat = await (opts.dereference ? fs$13.stat : fs$13.lstat)(src);
		if (srcStat.isDirectory()) return onDir$1(srcStat, destStat, src, dest, opts);
		if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile$1(srcStat, destStat, src, dest, opts);
		if (srcStat.isSymbolicLink()) return onLink$1(destStat, src, dest, opts);
		if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
		if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
		throw new Error(`Unknown file: ${src}`);
	}
	async function onFile$1(srcStat, destStat, src, dest, opts) {
		if (!destStat) return copyFile$1(srcStat, src, dest, opts);
		if (opts.overwrite) {
			await fs$13.unlink(dest);
			return copyFile$1(srcStat, src, dest, opts);
		}
		if (opts.errorOnExist) throw new Error(`'${dest}' already exists`);
	}
	async function copyFile$1(srcStat, src, dest, opts) {
		await fs$13.copyFile(src, dest);
		if (opts.preserveTimestamps) {
			if (fileIsNotWritable$1(srcStat.mode)) await makeFileWritable$1(dest, srcStat.mode);
			const updatedSrcStat = await fs$13.stat(src);
			await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
		}
		return fs$13.chmod(dest, srcStat.mode);
	}
	function fileIsNotWritable$1(srcMode) {
		return (srcMode & 128) === 0;
	}
	function makeFileWritable$1(dest, srcMode) {
		return fs$13.chmod(dest, srcMode | 128);
	}
	async function onDir$1(srcStat, destStat, src, dest, opts) {
		if (!destStat) await fs$13.mkdir(dest);
		await asyncIteratorConcurrentProcess(await fs$13.opendir(src), async (item) => {
			const srcItem = path$10.join(src, item.name);
			const destItem = path$10.join(dest, item.name);
			if (await runFilter(srcItem, destItem, opts)) {
				const { destStat: destStat$1 } = await stat$3.checkPaths(srcItem, destItem, "copy", opts);
				await getStatsAndPerformCopy(destStat$1, srcItem, destItem, opts);
			}
		});
		if (!destStat) await fs$13.chmod(dest, srcStat.mode);
	}
	async function onLink$1(destStat, src, dest, opts) {
		let resolvedSrc = await fs$13.readlink(src);
		if (opts.dereference) resolvedSrc = path$10.resolve(process.cwd(), resolvedSrc);
		if (!destStat) return fs$13.symlink(resolvedSrc, dest);
		let resolvedDest = null;
		try {
			resolvedDest = await fs$13.readlink(dest);
		} catch (e) {
			if (e.code === "EINVAL" || e.code === "UNKNOWN") return fs$13.symlink(resolvedSrc, dest);
			throw e;
		}
		if (opts.dereference) resolvedDest = path$10.resolve(process.cwd(), resolvedDest);
		if (stat$3.isSrcSubdir(resolvedSrc, resolvedDest)) throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
		if (stat$3.isSrcSubdir(resolvedDest, resolvedSrc)) throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
		await fs$13.unlink(dest);
		return fs$13.symlink(resolvedSrc, dest);
	}
	module.exports = copy$1;
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/copy/copy-sync.js
var require_copy_sync = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/copy/copy-sync.js": ((exports, module) => {
	const fs$12 = require_graceful_fs();
	const path$9 = __require("path");
	const mkdirsSync$1 = require_mkdirs().mkdirsSync;
	const utimesMillisSync = require_utimes().utimesMillisSync;
	const stat$2 = require_stat();
	function copySync$1(src, dest, opts) {
		if (typeof opts === "function") opts = { filter: opts };
		opts = opts || {};
		opts.clobber = "clobber" in opts ? !!opts.clobber : true;
		opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
		if (opts.preserveTimestamps && process.arch === "ia32") process.emitWarning("Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269", "Warning", "fs-extra-WARN0002");
		const { srcStat, destStat } = stat$2.checkPathsSync(src, dest, "copy", opts);
		stat$2.checkParentPathsSync(src, srcStat, dest, "copy");
		if (opts.filter && !opts.filter(src, dest)) return;
		const destParent = path$9.dirname(dest);
		if (!fs$12.existsSync(destParent)) mkdirsSync$1(destParent);
		return getStats(destStat, src, dest, opts);
	}
	function getStats(destStat, src, dest, opts) {
		const srcStat = (opts.dereference ? fs$12.statSync : fs$12.lstatSync)(src);
		if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
		else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
		else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
		else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
		else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
		throw new Error(`Unknown file: ${src}`);
	}
	function onFile(srcStat, destStat, src, dest, opts) {
		if (!destStat) return copyFile(srcStat, src, dest, opts);
		return mayCopyFile(srcStat, src, dest, opts);
	}
	function mayCopyFile(srcStat, src, dest, opts) {
		if (opts.overwrite) {
			fs$12.unlinkSync(dest);
			return copyFile(srcStat, src, dest, opts);
		} else if (opts.errorOnExist) throw new Error(`'${dest}' already exists`);
	}
	function copyFile(srcStat, src, dest, opts) {
		fs$12.copyFileSync(src, dest);
		if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
		return setDestMode(dest, srcStat.mode);
	}
	function handleTimestamps(srcMode, src, dest) {
		if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
		return setDestTimestamps(src, dest);
	}
	function fileIsNotWritable(srcMode) {
		return (srcMode & 128) === 0;
	}
	function makeFileWritable(dest, srcMode) {
		return setDestMode(dest, srcMode | 128);
	}
	function setDestMode(dest, srcMode) {
		return fs$12.chmodSync(dest, srcMode);
	}
	function setDestTimestamps(src, dest) {
		const updatedSrcStat = fs$12.statSync(src);
		return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
	}
	function onDir(srcStat, destStat, src, dest, opts) {
		if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
		return copyDir(src, dest, opts);
	}
	function mkDirAndCopy(srcMode, src, dest, opts) {
		fs$12.mkdirSync(dest);
		copyDir(src, dest, opts);
		return setDestMode(dest, srcMode);
	}
	function copyDir(src, dest, opts) {
		const dir = fs$12.opendirSync(src);
		try {
			let dirent;
			while ((dirent = dir.readSync()) !== null) copyDirItem(dirent.name, src, dest, opts);
		} finally {
			dir.closeSync();
		}
	}
	function copyDirItem(item, src, dest, opts) {
		const srcItem = path$9.join(src, item);
		const destItem = path$9.join(dest, item);
		if (opts.filter && !opts.filter(srcItem, destItem)) return;
		const { destStat } = stat$2.checkPathsSync(srcItem, destItem, "copy", opts);
		return getStats(destStat, srcItem, destItem, opts);
	}
	function onLink(destStat, src, dest, opts) {
		let resolvedSrc = fs$12.readlinkSync(src);
		if (opts.dereference) resolvedSrc = path$9.resolve(process.cwd(), resolvedSrc);
		if (!destStat) return fs$12.symlinkSync(resolvedSrc, dest);
		else {
			let resolvedDest;
			try {
				resolvedDest = fs$12.readlinkSync(dest);
			} catch (err) {
				if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs$12.symlinkSync(resolvedSrc, dest);
				throw err;
			}
			if (opts.dereference) resolvedDest = path$9.resolve(process.cwd(), resolvedDest);
			if (stat$2.isSrcSubdir(resolvedSrc, resolvedDest)) throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
			if (stat$2.isSrcSubdir(resolvedDest, resolvedSrc)) throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
			return copyLink(resolvedSrc, dest);
		}
	}
	function copyLink(resolvedSrc, dest) {
		fs$12.unlinkSync(dest);
		return fs$12.symlinkSync(resolvedSrc, dest);
	}
	module.exports = copySync$1;
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/copy/index.js
var require_copy = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/copy/index.js": ((exports, module) => {
	const u$10 = require_universalify().fromPromise;
	module.exports = {
		copy: u$10(require_copy$1()),
		copySync: require_copy_sync()
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/remove/index.js
var require_remove = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/remove/index.js": ((exports, module) => {
	const fs$11 = require_graceful_fs();
	const u$9 = require_universalify().fromCallback;
	function remove$2(path$13, callback) {
		fs$11.rm(path$13, {
			recursive: true,
			force: true
		}, callback);
	}
	function removeSync$1(path$13) {
		fs$11.rmSync(path$13, {
			recursive: true,
			force: true
		});
	}
	module.exports = {
		remove: u$9(remove$2),
		removeSync: removeSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/empty/index.js
var require_empty = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/empty/index.js": ((exports, module) => {
	const u$8 = require_universalify().fromPromise;
	const fs$10 = require_fs();
	const path$8 = __require("path");
	const mkdir$3 = require_mkdirs();
	const remove$1 = require_remove();
	const emptyDir = u$8(async function emptyDir$1(dir) {
		let items;
		try {
			items = await fs$10.readdir(dir);
		} catch {
			return mkdir$3.mkdirs(dir);
		}
		return Promise.all(items.map((item) => remove$1.remove(path$8.join(dir, item))));
	});
	function emptyDirSync(dir) {
		let items;
		try {
			items = fs$10.readdirSync(dir);
		} catch {
			return mkdir$3.mkdirsSync(dir);
		}
		items.forEach((item) => {
			item = path$8.join(dir, item);
			remove$1.removeSync(item);
		});
	}
	module.exports = {
		emptyDirSync,
		emptydirSync: emptyDirSync,
		emptyDir,
		emptydir: emptyDir
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/file.js
var require_file = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/file.js": ((exports, module) => {
	const u$7 = require_universalify().fromPromise;
	const path$7 = __require("path");
	const fs$9 = require_fs();
	const mkdir$2 = require_mkdirs();
	async function createFile$1(file) {
		let stats;
		try {
			stats = await fs$9.stat(file);
		} catch {}
		if (stats && stats.isFile()) return;
		const dir = path$7.dirname(file);
		let dirStats = null;
		try {
			dirStats = await fs$9.stat(dir);
		} catch (err) {
			if (err.code === "ENOENT") {
				await mkdir$2.mkdirs(dir);
				await fs$9.writeFile(file, "");
				return;
			} else throw err;
		}
		if (dirStats.isDirectory()) await fs$9.writeFile(file, "");
		else await fs$9.readdir(dir);
	}
	function createFileSync$1(file) {
		let stats;
		try {
			stats = fs$9.statSync(file);
		} catch {}
		if (stats && stats.isFile()) return;
		const dir = path$7.dirname(file);
		try {
			if (!fs$9.statSync(dir).isDirectory()) fs$9.readdirSync(dir);
		} catch (err) {
			if (err && err.code === "ENOENT") mkdir$2.mkdirsSync(dir);
			else throw err;
		}
		fs$9.writeFileSync(file, "");
	}
	module.exports = {
		createFile: u$7(createFile$1),
		createFileSync: createFileSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/link.js
var require_link = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/link.js": ((exports, module) => {
	const u$6 = require_universalify().fromPromise;
	const path$6 = __require("path");
	const fs$8 = require_fs();
	const mkdir$1 = require_mkdirs();
	const { pathExists: pathExists$4 } = require_path_exists();
	const { areIdentical: areIdentical$1 } = require_stat();
	async function createLink$1(srcpath, dstpath) {
		let dstStat;
		try {
			dstStat = await fs$8.lstat(dstpath);
		} catch {}
		let srcStat;
		try {
			srcStat = await fs$8.lstat(srcpath);
		} catch (err) {
			err.message = err.message.replace("lstat", "ensureLink");
			throw err;
		}
		if (dstStat && areIdentical$1(srcStat, dstStat)) return;
		const dir = path$6.dirname(dstpath);
		if (!await pathExists$4(dir)) await mkdir$1.mkdirs(dir);
		await fs$8.link(srcpath, dstpath);
	}
	function createLinkSync$1(srcpath, dstpath) {
		let dstStat;
		try {
			dstStat = fs$8.lstatSync(dstpath);
		} catch {}
		try {
			const srcStat = fs$8.lstatSync(srcpath);
			if (dstStat && areIdentical$1(srcStat, dstStat)) return;
		} catch (err) {
			err.message = err.message.replace("lstat", "ensureLink");
			throw err;
		}
		const dir = path$6.dirname(dstpath);
		if (fs$8.existsSync(dir)) return fs$8.linkSync(srcpath, dstpath);
		mkdir$1.mkdirsSync(dir);
		return fs$8.linkSync(srcpath, dstpath);
	}
	module.exports = {
		createLink: u$6(createLink$1),
		createLinkSync: createLinkSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/symlink-paths.js": ((exports, module) => {
	const path$5 = __require("path");
	const fs$7 = require_fs();
	const { pathExists: pathExists$3 } = require_path_exists();
	const u$5 = require_universalify().fromPromise;
	/**
	* Function that returns two types of paths, one relative to symlink, and one
	* relative to the current working directory. Checks if path is absolute or
	* relative. If the path is relative, this function checks if the path is
	* relative to symlink or relative to current working directory. This is an
	* initiative to find a smarter `srcpath` to supply when building symlinks.
	* This allows you to determine which path to use out of one of three possible
	* types of source paths. The first is an absolute path. This is detected by
	* `path.isAbsolute()`. When an absolute path is provided, it is checked to
	* see if it exists. If it does it's used, if not an error is returned
	* (callback)/ thrown (sync). The other two options for `srcpath` are a
	* relative url. By default Node's `fs.symlink` works by creating a symlink
	* using `dstpath` and expects the `srcpath` to be relative to the newly
	* created symlink. If you provide a `srcpath` that does not exist on the file
	* system it results in a broken symlink. To minimize this, the function
	* checks to see if the 'relative to symlink' source file exists, and if it
	* does it will use it. If it does not, it checks if there's a file that
	* exists that is relative to the current working directory, if does its used.
	* This preserves the expectations of the original fs.symlink spec and adds
	* the ability to pass in `relative to current working direcotry` paths.
	*/
	async function symlinkPaths$1(srcpath, dstpath) {
		if (path$5.isAbsolute(srcpath)) {
			try {
				await fs$7.lstat(srcpath);
			} catch (err) {
				err.message = err.message.replace("lstat", "ensureSymlink");
				throw err;
			}
			return {
				toCwd: srcpath,
				toDst: srcpath
			};
		}
		const dstdir = path$5.dirname(dstpath);
		const relativeToDst = path$5.join(dstdir, srcpath);
		if (await pathExists$3(relativeToDst)) return {
			toCwd: relativeToDst,
			toDst: srcpath
		};
		try {
			await fs$7.lstat(srcpath);
		} catch (err) {
			err.message = err.message.replace("lstat", "ensureSymlink");
			throw err;
		}
		return {
			toCwd: srcpath,
			toDst: path$5.relative(dstdir, srcpath)
		};
	}
	function symlinkPathsSync$1(srcpath, dstpath) {
		if (path$5.isAbsolute(srcpath)) {
			if (!fs$7.existsSync(srcpath)) throw new Error("absolute srcpath does not exist");
			return {
				toCwd: srcpath,
				toDst: srcpath
			};
		}
		const dstdir = path$5.dirname(dstpath);
		const relativeToDst = path$5.join(dstdir, srcpath);
		if (fs$7.existsSync(relativeToDst)) return {
			toCwd: relativeToDst,
			toDst: srcpath
		};
		if (!fs$7.existsSync(srcpath)) throw new Error("relative srcpath does not exist");
		return {
			toCwd: srcpath,
			toDst: path$5.relative(dstdir, srcpath)
		};
	}
	module.exports = {
		symlinkPaths: u$5(symlinkPaths$1),
		symlinkPathsSync: symlinkPathsSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/symlink-type.js": ((exports, module) => {
	const fs$6 = require_fs();
	const u$4 = require_universalify().fromPromise;
	async function symlinkType$1(srcpath, type) {
		if (type) return type;
		let stats;
		try {
			stats = await fs$6.lstat(srcpath);
		} catch {
			return "file";
		}
		return stats && stats.isDirectory() ? "dir" : "file";
	}
	function symlinkTypeSync$1(srcpath, type) {
		if (type) return type;
		let stats;
		try {
			stats = fs$6.lstatSync(srcpath);
		} catch {
			return "file";
		}
		return stats && stats.isDirectory() ? "dir" : "file";
	}
	module.exports = {
		symlinkType: u$4(symlinkType$1),
		symlinkTypeSync: symlinkTypeSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/symlink.js": ((exports, module) => {
	const u$3 = require_universalify().fromPromise;
	const path$4 = __require("path");
	const fs$5 = require_fs();
	const { mkdirs, mkdirsSync } = require_mkdirs();
	const { symlinkPaths, symlinkPathsSync } = require_symlink_paths();
	const { symlinkType, symlinkTypeSync } = require_symlink_type();
	const { pathExists: pathExists$2 } = require_path_exists();
	const { areIdentical } = require_stat();
	async function createSymlink$1(srcpath, dstpath, type) {
		let stats;
		try {
			stats = await fs$5.lstat(dstpath);
		} catch {}
		if (stats && stats.isSymbolicLink()) {
			const [srcStat, dstStat] = await Promise.all([fs$5.stat(srcpath), fs$5.stat(dstpath)]);
			if (areIdentical(srcStat, dstStat)) return;
		}
		const relative = await symlinkPaths(srcpath, dstpath);
		srcpath = relative.toDst;
		const toType = await symlinkType(relative.toCwd, type);
		const dir = path$4.dirname(dstpath);
		if (!await pathExists$2(dir)) await mkdirs(dir);
		return fs$5.symlink(srcpath, dstpath, toType);
	}
	function createSymlinkSync$1(srcpath, dstpath, type) {
		let stats;
		try {
			stats = fs$5.lstatSync(dstpath);
		} catch {}
		if (stats && stats.isSymbolicLink()) {
			if (areIdentical(fs$5.statSync(srcpath), fs$5.statSync(dstpath))) return;
		}
		const relative = symlinkPathsSync(srcpath, dstpath);
		srcpath = relative.toDst;
		type = symlinkTypeSync(relative.toCwd, type);
		const dir = path$4.dirname(dstpath);
		if (fs$5.existsSync(dir)) return fs$5.symlinkSync(srcpath, dstpath, type);
		mkdirsSync(dir);
		return fs$5.symlinkSync(srcpath, dstpath, type);
	}
	module.exports = {
		createSymlink: u$3(createSymlink$1),
		createSymlinkSync: createSymlinkSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/index.js
var require_ensure = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/ensure/index.js": ((exports, module) => {
	const { createFile, createFileSync } = require_file();
	const { createLink, createLinkSync } = require_link();
	const { createSymlink, createSymlinkSync } = require_symlink();
	module.exports = {
		createFile,
		createFileSync,
		ensureFile: createFile,
		ensureFileSync: createFileSync,
		createLink,
		createLinkSync,
		ensureLink: createLink,
		ensureLinkSync: createLinkSync,
		createSymlink,
		createSymlinkSync,
		ensureSymlink: createSymlink,
		ensureSymlinkSync: createSymlinkSync
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/jsonfile@6.2.0/node_modules/jsonfile/utils.js
var require_utils = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/jsonfile@6.2.0/node_modules/jsonfile/utils.js": ((exports, module) => {
	function stringify$3(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
		const EOF = finalEOL ? EOL : "";
		return JSON.stringify(obj, replacer, spaces).replace(/\n/g, EOL) + EOF;
	}
	function stripBom$1(content) {
		if (Buffer.isBuffer(content)) content = content.toString("utf8");
		return content.replace(/^\uFEFF/, "");
	}
	module.exports = {
		stringify: stringify$3,
		stripBom: stripBom$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/jsonfile@6.2.0/node_modules/jsonfile/index.js
var require_jsonfile$1 = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/jsonfile@6.2.0/node_modules/jsonfile/index.js": ((exports, module) => {
	let _fs;
	try {
		_fs = require_graceful_fs();
	} catch (_) {
		_fs = __require("fs");
	}
	const universalify = require_universalify();
	const { stringify: stringify$2, stripBom } = require_utils();
	async function _readFile(file, options = {}) {
		if (typeof options === "string") options = { encoding: options };
		const fs$20 = options.fs || _fs;
		const shouldThrow = "throws" in options ? options.throws : true;
		let data = await universalify.fromCallback(fs$20.readFile)(file, options);
		data = stripBom(data);
		let obj;
		try {
			obj = JSON.parse(data, options ? options.reviver : null);
		} catch (err) {
			if (shouldThrow) {
				err.message = `${file}: ${err.message}`;
				throw err;
			} else return null;
		}
		return obj;
	}
	const readFile = universalify.fromPromise(_readFile);
	function readFileSync(file, options = {}) {
		if (typeof options === "string") options = { encoding: options };
		const fs$20 = options.fs || _fs;
		const shouldThrow = "throws" in options ? options.throws : true;
		try {
			let content = fs$20.readFileSync(file, options);
			content = stripBom(content);
			return JSON.parse(content, options.reviver);
		} catch (err) {
			if (shouldThrow) {
				err.message = `${file}: ${err.message}`;
				throw err;
			} else return null;
		}
	}
	async function _writeFile(file, obj, options = {}) {
		const fs$20 = options.fs || _fs;
		const str = stringify$2(obj, options);
		await universalify.fromCallback(fs$20.writeFile)(file, str, options);
	}
	const writeFile = universalify.fromPromise(_writeFile);
	function writeFileSync(file, obj, options = {}) {
		const fs$20 = options.fs || _fs;
		const str = stringify$2(obj, options);
		return fs$20.writeFileSync(file, str, options);
	}
	module.exports = {
		readFile,
		readFileSync,
		writeFile,
		writeFileSync
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/jsonfile.js": ((exports, module) => {
	const jsonFile$1 = require_jsonfile$1();
	module.exports = {
		readJson: jsonFile$1.readFile,
		readJsonSync: jsonFile$1.readFileSync,
		writeJson: jsonFile$1.writeFile,
		writeJsonSync: jsonFile$1.writeFileSync
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/output-file/index.js
var require_output_file = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/output-file/index.js": ((exports, module) => {
	const u$2 = require_universalify().fromPromise;
	const fs$4 = require_fs();
	const path$3 = __require("path");
	const mkdir = require_mkdirs();
	const pathExists$1 = require_path_exists().pathExists;
	async function outputFile$1(file, data, encoding = "utf-8") {
		const dir = path$3.dirname(file);
		if (!await pathExists$1(dir)) await mkdir.mkdirs(dir);
		return fs$4.writeFile(file, data, encoding);
	}
	function outputFileSync$1(file, ...args) {
		const dir = path$3.dirname(file);
		if (!fs$4.existsSync(dir)) mkdir.mkdirsSync(dir);
		fs$4.writeFileSync(file, ...args);
	}
	module.exports = {
		outputFile: u$2(outputFile$1),
		outputFileSync: outputFileSync$1
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/output-json.js
var require_output_json = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/output-json.js": ((exports, module) => {
	const { stringify: stringify$1 } = require_utils();
	const { outputFile } = require_output_file();
	async function outputJson(file, data, options = {}) {
		await outputFile(file, stringify$1(data, options), options);
	}
	module.exports = outputJson;
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/output-json-sync.js": ((exports, module) => {
	const { stringify } = require_utils();
	const { outputFileSync } = require_output_file();
	function outputJsonSync(file, data, options) {
		outputFileSync(file, stringify(data, options), options);
	}
	module.exports = outputJsonSync;
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/index.js
var require_json = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/json/index.js": ((exports, module) => {
	const u$1 = require_universalify().fromPromise;
	const jsonFile = require_jsonfile();
	jsonFile.outputJson = u$1(require_output_json());
	jsonFile.outputJsonSync = require_output_json_sync();
	jsonFile.outputJSON = jsonFile.outputJson;
	jsonFile.outputJSONSync = jsonFile.outputJsonSync;
	jsonFile.writeJSON = jsonFile.writeJson;
	jsonFile.writeJSONSync = jsonFile.writeJsonSync;
	jsonFile.readJSON = jsonFile.readJson;
	jsonFile.readJSONSync = jsonFile.readJsonSync;
	module.exports = jsonFile;
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/move/move.js
var require_move$1 = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/move/move.js": ((exports, module) => {
	const fs$3 = require_fs();
	const path$2 = __require("path");
	const { copy } = require_copy();
	const { remove } = require_remove();
	const { mkdirp } = require_mkdirs();
	const { pathExists } = require_path_exists();
	const stat$1 = require_stat();
	async function move(src, dest, opts = {}) {
		const overwrite = opts.overwrite || opts.clobber || false;
		const { srcStat, isChangingCase = false } = await stat$1.checkPaths(src, dest, "move", opts);
		await stat$1.checkParentPaths(src, srcStat, dest, "move");
		const destParent = path$2.dirname(dest);
		if (path$2.parse(destParent).root !== destParent) await mkdirp(destParent);
		return doRename$1(src, dest, overwrite, isChangingCase);
	}
	async function doRename$1(src, dest, overwrite, isChangingCase) {
		if (!isChangingCase) {
			if (overwrite) await remove(dest);
			else if (await pathExists(dest)) throw new Error("dest already exists.");
		}
		try {
			await fs$3.rename(src, dest);
		} catch (err) {
			if (err.code !== "EXDEV") throw err;
			await moveAcrossDevice$1(src, dest, overwrite);
		}
	}
	async function moveAcrossDevice$1(src, dest, overwrite) {
		await copy(src, dest, {
			overwrite,
			errorOnExist: true,
			preserveTimestamps: true
		});
		return remove(src);
	}
	module.exports = move;
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/move/move-sync.js
var require_move_sync = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/move/move-sync.js": ((exports, module) => {
	const fs$2 = require_graceful_fs();
	const path$1 = __require("path");
	const copySync = require_copy().copySync;
	const removeSync = require_remove().removeSync;
	const mkdirpSync = require_mkdirs().mkdirpSync;
	const stat = require_stat();
	function moveSync(src, dest, opts) {
		opts = opts || {};
		const overwrite = opts.overwrite || opts.clobber || false;
		const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, "move", opts);
		stat.checkParentPathsSync(src, srcStat, dest, "move");
		if (!isParentRoot(dest)) mkdirpSync(path$1.dirname(dest));
		return doRename(src, dest, overwrite, isChangingCase);
	}
	function isParentRoot(dest) {
		const parent = path$1.dirname(dest);
		return path$1.parse(parent).root === parent;
	}
	function doRename(src, dest, overwrite, isChangingCase) {
		if (isChangingCase) return rename(src, dest, overwrite);
		if (overwrite) {
			removeSync(dest);
			return rename(src, dest, overwrite);
		}
		if (fs$2.existsSync(dest)) throw new Error("dest already exists.");
		return rename(src, dest, overwrite);
	}
	function rename(src, dest, overwrite) {
		try {
			fs$2.renameSync(src, dest);
		} catch (err) {
			if (err.code !== "EXDEV") throw err;
			return moveAcrossDevice(src, dest, overwrite);
		}
	}
	function moveAcrossDevice(src, dest, overwrite) {
		copySync(src, dest, {
			overwrite,
			errorOnExist: true,
			preserveTimestamps: true
		});
		return removeSync(src);
	}
	module.exports = moveSync;
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/move/index.js
var require_move = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/move/index.js": ((exports, module) => {
	const u = require_universalify().fromPromise;
	module.exports = {
		move: u(require_move$1()),
		moveSync: require_move_sync()
	};
}) });

//#endregion
//#region ../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/index.js
var require_lib = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/fs-extra@11.3.2/node_modules/fs-extra/lib/index.js": ((exports, module) => {
	module.exports = {
		...require_fs(),
		...require_copy(),
		...require_empty(),
		...require_ensure(),
		...require_json(),
		...require_mkdirs(),
		...require_move(),
		...require_output_file(),
		...require_path_exists(),
		...require_remove()
	};
}) });

//#endregion
//#region src/plugins/fixReactRouterManifestUrls.ts
var import_lib$1 = /* @__PURE__ */ __toESM(require_lib(), 1);
/**
* Plugin to transform React Router client manifest URLs to use dynamic bundle paths
*/
function fixReactRouterManifestUrlsPlugin() {
	let resolvedConfig;
	return {
		name: "odyssey:fix-react-router-manifest-urls",
		enforce: "post",
		configResolved(config) {
			resolvedConfig = config;
		},
		closeBundle() {
			if (resolvedConfig?.mode === "preview") return;
			const { readdirSync, existsSync } = import_lib$1.default;
			const clientBuildDir = resolvedConfig.environments.client.build.outDir;
			if (!existsSync(clientBuildDir)) return;
			const findManifestFiles = (dir) => {
				const files = [];
				const entries = readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) files.push(...findManifestFiles(fullPath));
					else if (entry.name.includes("manifest-") && entry.name.endsWith(".js")) files.push(fullPath);
				}
				return files;
			};
			const manifestFiles = findManifestFiles(clientBuildDir);
			for (const filePath of manifestFiles) {
				let content = import_lib$1.default.readFileSync(filePath, "utf-8");
				if (content.includes("\"/assets/") || content.includes("'/assets/")) {
					content = content.replace(/["']\/assets\//g, "(window._BUNDLE_PATH || \"/\") + \"assets/");
					import_lib$1.default.writeFileSync(filePath, content);
				}
			}
		}
	};
}

//#endregion
//#region src/plugins/readableChunkFileNames.ts
/**
* Generates human-readable chunk file names for better debugging in production builds.
*
* Transforms Rollup's default hash-based chunk names into structured paths that reflect
* the original source location, making it easier to identify and debug specific chunks.
*
* @param chunkInfo - Rollup's pre-rendered chunk information containing module IDs and metadata
* @returns A formatted string pattern for the chunk filename with one of these formats:
*   - `assets/(folder1)-(folder2)-filename.[hash].js` for source files in /src/
*   - `assets/(package)-(pkg-name)-(subfolder)-filename.[hash].js` for node_modules
*   - `assets/(chunk)-[name].[hash].js` as fallback for chunks without identifiable paths
*
* @example
* // Source file: /src/components/ui/Button.tsx
* // Output: assets/(components)-(ui)-Button.[hash].js
*
* @example
* // Node module: /node_modules/@radix-ui/react-dialog/dist/index.js
* // Output: assets/(package)-(@radix-ui)-(react-dialog)-(dist)-index.[hash].js
*/
const readableChunkFileNames = (chunkInfo) => {
	const moduleIds = chunkInfo.moduleIds;
	const defaultName = "assets/(chunk)-[name].[hash].js";
	if (!moduleIds || moduleIds.length === 0) return defaultName;
	const lastModuleId = moduleIds[moduleIds.length - 1];
	const toPosixPath = (pathname) => {
		return pathname.replace(/\\/g, "/");
	};
	const getFileName = (pathname) => {
		const posixPath = toPosixPath(pathname);
		return path.posix.parse(posixPath).base.split("?")[0].replace(/\.(tsx?|jsx?|mjs|js)$/, "");
	};
	const cleanPath = (pathname) => {
		return pathname?.split("?")[0];
	};
	const normalizedModuleId = toPosixPath(lastModuleId);
	if (normalizedModuleId.includes("/src/")) {
		const match = toPosixPath(cleanPath(lastModuleId)).match(/\/src\/(.+)$/);
		if (match) {
			const parts = match[1].split("/");
			const fileName = getFileName(parts[parts.length - 1]);
			return `assets/${parts.slice(0, -1).map((f) => `(${f})`).join("-")}-${fileName}.[hash].js`;
		}
	}
	if (normalizedModuleId.includes("/node_modules/")) {
		const parts = toPosixPath(cleanPath(lastModuleId)).split("/node_modules/");
		const pathParts = parts[parts.length - 1].split("/");
		let packageName;
		let remainingPath;
		if (pathParts[0].startsWith("@")) {
			packageName = `${pathParts[0]}-${pathParts[1]}`;
			remainingPath = pathParts.slice(2);
		} else {
			packageName = pathParts[0];
			remainingPath = pathParts.slice(1);
		}
		const fileName = getFileName(remainingPath[remainingPath.length - 1]);
		const folders = remainingPath.slice(0, -1);
		return `assets/${[
			"package",
			packageName,
			...folders
		].map((s) => `(${s})`).join("-")}-${fileName}.[hash].js`;
	}
	return defaultName;
};
/**
* Vite plugin that configures Rollup to use human-readable chunk file names in production builds.
*
* Applies the `readableChunkFileNames` naming strategy to both code-split chunks and entry files,
* making it easier to identify the source of specific chunks when debugging production builds.
*
* @returns A Vite plugin that configures chunk naming for the client build environment
*
* @example
* // In vite.config.ts
* export default defineConfig({
*   plugins: [readableChunkFileNamesPlugin()]
* })
*/
const readableChunkFileNamesPlugin = () => {
	return {
		name: "odyssey:readable-chunk-file-names",
		apply: "build",
		config() {
			return { environments: { client: { build: { rollupOptions: { output: {
				chunkFileNames: readableChunkFileNames,
				entryFileNames: readableChunkFileNames
			} } } } } };
		}
	};
};

//#endregion
//#region src/plugins/managedRuntimeBundle.ts
var import_lib = /* @__PURE__ */ __toESM(require_lib(), 1);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
* This is a Vite plugin specifically for building the Managed Runtime production bundle.
* This plugin relies on the @react-router/dev/vite plugin to work.
* This plugin creates the Managed Runtime production bundle from the build output of the @react-router/dev/vite plugin.
*
* @returns {Plugin} A Vite plugin for building the Managed Runtime production react-router bundle
*/
const managedRuntimeBundlePlugin = () => {
	let resolvedConfig;
	let buildDirectory;
	/**
	* Creates the Managed Runtime production bundle assets
	* - ssr.js
	* - loader.js
	* - package.json
	*
	* @returns {Promise<void>}
	*/
	const createManagedRuntimeBundleAssets = async () => {
		const loaderPath = path.resolve(buildDirectory, "loader.js");
		const ssrPath = path.resolve(buildDirectory, "ssr.js");
		await import_lib.default.ensureDir(buildDirectory);
		await import_lib.default.outputFile(loaderPath, "// This file is intentionally empty");
		const prebuiltSsrPath = path.resolve(__dirname, "./mrt/ssr.js");
		await import_lib.default.copy(prebuiltSsrPath, ssrPath);
		const packageJsonPath = path.resolve(resolvedConfig.root, "package.json");
		const buildPackageJsonPath = path.resolve(buildDirectory, "package.json");
		const packageJson = await import_lib.default.readJson(packageJsonPath);
		delete packageJson.type;
		await import_lib.default.writeJson(buildPackageJsonPath, packageJson, { spaces: 2 });
	};
	return {
		name: "odyssey:managed-runtime-bundle",
		apply: "build",
		config({ mode }) {
			return {
				environments: { ssr: { resolve: { noExternal: true } } },
				experimental: { renderBuiltUrl(filename, { type }) {
					if (mode !== "preview" && (type === "asset" || type === "public")) return { runtime: `(typeof window !== 'undefined' ? window._BUNDLE_PATH : ('/mobify/bundle/'+process.env.BUNDLE_ID+'/client/')) + ${JSON.stringify(filename)}` };
				} }
			};
		},
		configResolved(config) {
			resolvedConfig = config;
			buildDirectory = config.__reactRouterPluginContext.reactRouterConfig.buildDirectory;
		},
		buildApp: {
			order: "post",
			handler: async () => {
				await createManagedRuntimeBundleAssets();
			}
		}
	};
};

//#endregion
//#region src/plugins/patchReactRouter.ts
const VIRTUAL_MODULE_ID = "\0patched-react-router";
const MODULE_TO_PATCH = "react-router";
/**
* This plugin intercepts imports of 'react-router' and provides patched versions
* of specific components (like Scripts) with custom logic.
*
* @returns {Plugin} A Vite plugin for patching react-router components
*/
const patchReactRouterPlugin = () => {
	return {
		name: "odyssey:patch-react-router",
		enforce: "pre",
		configEnvironment(name) {
			if (name === "ssr") return { resolve: { noExternal: ["react-router"] } };
		},
		resolveId(id, importer) {
			if (id === MODULE_TO_PATCH) {
				if (importer === VIRTUAL_MODULE_ID || importer?.includes("vite-plugin-odyssey")) return null;
				return VIRTUAL_MODULE_ID;
			}
			return null;
		},
		load(id) {
			if (id === VIRTUAL_MODULE_ID) return `
                    export * from 'react-router';
                    export { Scripts } from '@salesforce/vite-plugin-odyssey/react-router/Scripts';
                `;
			return null;
		}
	};
};

//#endregion
//#region src/plugin.ts
/**
* Odyssey Vite plugin that powers the React Router RSC app.
* Supports building and optimizing for the managed runtime environment.
*
* @param config - Configuration options for the plugin
* @returns {Plugin[]} An array of Vite plugins for Odyssey functionality
*
* @example
* // With default options
* export default defineConfig({
*   plugins: [odysseyPlugin()]
* })
*
* @example
* // Disable readable chunk names
* export default defineConfig({
*   plugins: [odysseyPlugin({ readableChunkNames: false })]
* })
*/
function odysseyPlugins(config = {}) {
	const { readableChunkNames = false } = config;
	const plugins = [
		managedRuntimeBundlePlugin(),
		fixReactRouterManifestUrlsPlugin(),
		patchReactRouterPlugin()
	];
	if (readableChunkNames) plugins.push(readableChunkFileNamesPlugin());
	return plugins;
}

//#endregion
export { odysseyPlugins as default };
//# sourceMappingURL=index.js.map