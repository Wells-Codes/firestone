import { Injectable } from '@angular/core';

declare let amplitude;

@Injectable()
export class DebugService {
	constructor() {
		const debugMode = process.env.NODE_ENV === 'production' || process.env.LOCAL_TEST != null;
		console.log = this.override(console.log, debugMode);
		console.warn = this.override(console.warn, debugMode);
		console.error = this.overrideError(console.error, debugMode);
	}

	private override(oldConsoleLogFunc: any, debugMode: boolean) {
		if (debugMode) {
			return function() {
				let argsString = '';
				for (let i = 0; i < arguments.length; i++) {
					let cache = [];
					argsString +=
						(
							JSON.stringify(arguments[i], function(key, value) {
								if (typeof value === 'object' && value !== null) {
									if (cache.indexOf(value) !== -1) {
										// Circular reference found, discard key
										return;
									}
									// Store value in our collection
									cache.push(value);
								}
								return value;
							}) || ''
						).substring(0, 1000) + ' | ';
					cache = null; // Enable garbage collection + " | "
				}
				oldConsoleLogFunc.apply(console, [argsString]);
			};
		}
		return oldConsoleLogFunc;
	}

	private overrideError(oldConsoleLogFunc: any, debugMode: boolean) {
		if (debugMode) {
			return function() {
				amplitude.getInstance().logEvent('error-logged');
				const stack = new Error().stack;
				// oldConsoleLogFunc.apply(console, arguments, stack);
				let argsString = stack + '\n|';
				for (let i = 0; i < arguments.length; i++) {
					let cache = [];
					argsString +=
						(
							JSON.stringify(arguments[i], function(key, value) {
								if (typeof value === 'object' && value !== null) {
									if (cache.indexOf(value) !== -1) {
										// Circular reference found, discard key
										return;
									}
									// Store value in our collection
									cache.push(value);
								}
								return value;
							}) || ''
						).substring(0, 1000) + ' | ';
					cache = null; // Enable garbage collection + " | "
				}
				oldConsoleLogFunc.apply(console, [argsString]);
			};
		}
		return oldConsoleLogFunc;
	}
}
