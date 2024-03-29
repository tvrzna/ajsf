/**
	ajsf 0.0.1-20230822

	https://github.com/tvrzna/ajsf
**/
Ajsf = {
	init: function(app, el, id) {
		el.find('[ajsf-bind]').each(function(i, e) {
			var $e = $(e);
			var attr = $e.attr('ajsf-bind');

			if (Ajsf.digObject(app, attr) === undefined) {
				Ajsf.digObject(app, attr, '');
			}
			if ($e.prop('tagName') === 'INPUT' || $e.prop('tagName') === 'TEXTAREA' || $e.prop('tagName') === 'SELECT') {
				var event;
				if ($e.prop('tagName') === 'TEXTAREA') {
					event = 'input';
				} else {
					switch ($e.prop('type')) {
						case 'text':
						case 'password':
						case 'email':
						case 'url':
						case 'search':
						case 'number':
							event = 'input';
							break;
						case 'submit':
							break;
						default:
							event = 'change';
					}
				}

				if (event !== undefined) {
					$e.on(event, function() {
						Ajsf.digObject(app, attr, Ajsf.getVal(e));
						Ajsf.refresh(app, el, attr);
					});
				}
			}
		});

		createEvent = function(attrEvent) {
			el.find('[' + attrEvent + ']').each(function(i, e) {
				var $e = $(e);
				var attr = $e.attr(attrEvent);

				$e.on(Ajsf.basicEvents[attrEvent], function(event) {
					var fce = Ajsf.digObject(app, attr, undefined, true);
					if (typeof fce[0] === 'function') {
						fce[0](event, ...fce[1], $(this));
					}
				});
			});
		};

		for (var attrEvent in Ajsf.basicEvents) {
			createEvent(attrEvent);
		}

		Ajsf.refresh(app, el, undefined, id);
	},
	basicEvents: {
		'ajsf-blur': 'blur',
		'ajsf-change': 'change',
		'ajsf-click': 'click',
		'ajsf-keydown': 'keydown',
		'ajsf-keyup': 'keyup',
		'ajsf-mousedown': 'mousedown',
		'ajsf-mouseup': 'mouseup',
		'ajsf-submit': 'submit'
	},
	convertToObject: function(str) {
		return JSON.parse(JSON.stringify(eval('(' + str + ')')));
	},
	digObject: function(app, attr, setValue, returnWithArguments) {
		var expression = attr.match(/(([^\|]+)|([^\'\|]*\'[^\']*\'[^\'\|]+))/g);

		var negative = false;
		var result;
		var args = [];

		var attribute = expression[0].trim();
		if ((attribute.startsWith('\'') && attribute.endsWith('\''))) {
			result = attribute.substring(1, attribute.length - 1);
		} else {
			if (attribute.startsWith('!')) {
				attribute = attribute.substring(1).trim();
				negative = true;
			}

			if (attribute === 'false' || attribute === 'true') {
				result = attribute === 'true';
			} else if (attribute === 'undefined') {
				result = undefined;
			} else if (!isNaN(attribute)) {
				result = Number(attribute);
			} else {
				var obj = app.context;

				if (attribute.startsWith('root().')) {
					attribute = attribute.substring(7).trim();
					while (typeof obj.parent === 'function') {
						obj = obj.parent();
					}
				}
				while (attribute.startsWith('parent().')) {
					attribute = attribute.substring(9).trim();
					if (typeof obj.parent === 'function') {
						obj = obj.parent();
					}
				}

				var argsRegex = /(([^'\.\(\)\[\]]+)\((([^\)]*\'[^\']*\'[^\)]*)|([^\']*))\))/g;
				var argsMatch = argsRegex.exec(attribute);
				if (argsMatch !== null && argsMatch[0] !== undefined) {
					var strArgs = argsMatch[3];
					attribute = argsMatch[2];

					var argRegex = /\s?([^',]+|([^']+\(.*\))|\'([^']*)\')\s?,?\s?/g;
					var matchFceArgs;

					while((matchFceArgs = argRegex.exec(strArgs)) !== null) {
						var arg = Ajsf.digObject(app, matchFceArgs[1], setValue, true);
						args.push(typeof arg[0] === 'function' ? arg[0](...arg[1]) : arg[0]);
					}
				}

				var indexRegex = /\[([^\]]*\]*)\]/g;
				var attributes = attribute.split('.'), i = 0;
				for (; i < attributes.length - 1; i++) {
					var dataDots = attributes[i].substring(0, attributes[i].indexOf('['));
					indexRegex.lastIndex = 0;
					var matchDots = indexRegex.exec(attributes[i]);
					if (matchDots !== null && matchDots[1] !== undefined) {
						var indexDots = Ajsf.digObject(app, matchDots[1]);
						obj = obj[dataDots][indexDots];
					} else if (obj[attributes[i]] !== undefined) {
						obj = obj[attributes[i]];
					}
				}

				indexRegex.lastIndex = 0;
				var match = indexRegex.exec(attributes[i]);
				if (match !== null && match[1] !== undefined) {
					var data = attributes[i].substring(0, attributes[i].indexOf('['));
					var index = Ajsf.digObject(app, match[1]);
					if (setValue !== undefined) {
						obj[data][index] = setValue;
						return;
					}
					result = obj[data][index];
				} else {
					if (setValue !== undefined) {
						obj[attributes[i]] = setValue;
						return;
					}
					result = obj[attributes[i]];
				}
			}
		}

		if (typeof result === 'function' && !returnWithArguments) {
			result = result(...args);
		}

		if (negative) {
			result = !result;
		}

		if (returnWithArguments)
		{
			return [result, args];
		}

		for (var j = 1; j < expression.length; j++) {
			if (expression[j] !== undefined) {
				result = Ajsf.filter(app, expression[j].trim(), result);
			}
		}

		return result;
	},
	filter: function(app, expression, value) {
		if (value === undefined || value === null) {
			return value;
		}

		var method, param;

		expression = expression.replace(/\s\s+/g, ' ');
		method = expression.split(' ')[0];

		if (expression.indexOf(' ') > 0) {
			param = expression.substring(expression.indexOf(' ')).trim();
			if (param !== undefined) {
				if ((param.startsWith('\'') && param.endsWith('\''))) {
					param = param.substring(1, param.length - 1);
				} else if (param.startsWith('{') && param.endsWith('}')) {
					param = Ajsf.convertToObject(param);
				} else if (!isNaN(param)) {
					param = Number(param);
				} else {
					param = Ajsf.digObject(app, param);
				}
			}
		}

		for (var name in app.filters) {
			if (name.toLowerCase() === method.toLowerCase()) {
				var ctx = app.context.parent !== undefined ? app.context.parent() : app.context;
				return app.filters[name].definition(ctx, value, param);
			}
		}

		switch (method.toLowerCase()) {
			case 'gt':
				return value > param;
			case 'gte':
				return value >= param;
			case 'lt':
				return value < param;
			case 'lte':
				return value <= param;
			case 'eq':
				return value == param;
			case 'ne':
				return value != param;
			case 'limit':
				return value.slice(0, Number(param));
			case 'and':
				return value && param;
			case 'or':
				return value || param;
			case 'prefix':
				return param + value;
			case 'suffix':
				return value + param;
			case 'then':
				if (value) {
					return param;
				}
				return value;
			case 'else':
				if (!value) {
					return param;
				}
				return value;
			case 'filter':
				if (typeof value === 'object' && ('' + value.constructor).toString().indexOf('Array') > 0) {
					var result = [];
					for (var i in value) {
						var val = value[i];
						if (typeof val === 'string') {
							if (val === param) {
								result.push(val);
							}
						} else if (typeof val === 'object') {
							if (!Object.keys(param).length) {
								result.push(val);
							}
							for (var attr in param) {
								if (param[attr] === undefined || val[attr] === param[attr]) {
									result.push(val);
								}
							}
						}
					}
					return result;
				}
				return value;
			default:
				console.warn('Filter ' + method + ' is not implemented yet.')
				return value;
		}
	},
	randomString: function(length) {
		var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		var str = '';
		for (let i = 0; i < length; i++) {
			str += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		return str;
	},
	refresh: function(app, el, attr, id) {
		var prefix = ':not([ajsf-repeated]) > ';
		if (el.is('[ajsf-repeated]')) {
			prefix = '';
			if (id !== undefined) {
				prefix = '[ajsf-repeated="' + id + '"]';
				el = el.parent();
			}
		}

		var suffix = '';
		if (attr !== undefined && Ajsf.digObject(app, attr) !== undefined) {
			suffix = '="' + attr +'"';
		}

		el.find(prefix + '[ajsf-bind' + suffix +']').each(function(i, e) {
			var cpyAttr = attr;
			if (suffix === '') {
				cpyAttr = $(e).attr('ajsf-bind');
			}
			Ajsf.setVal(e, Ajsf.digObject(app, cpyAttr));
		});

		el.find(prefix + '[ajsf-hide' + suffix + ']').each(function(i, e) {
			var $e = $(e);

			var cpyAttr = attr;
			if (suffix === '') {
				cpyAttr = $e.attr('ajsf-hide');
			}
			if (Ajsf.digObject(app, cpyAttr)) {
				$e.hide();
			} else {
				$e.show();
			}
		});

		el.find(prefix + '[ajsf-show' + suffix + ']').each(function(i, e) {
			var $e = $(e);

			var cpyAttr = attr;
			if (suffix === '') {
				cpyAttr = $e.attr('ajsf-show');
			}
			if (Ajsf.digObject(app, cpyAttr)) {
				$e.show();
			} else {
				$e.hide();
			}
		});

		el.find(prefix + '[ajsf-class]').each(function(i, e) {
			var $e = $(e);
			var cpyAttr = Ajsf.convertToObject($e.attr('ajsf-class'));

			for (var styleClass in cpyAttr) {
				var value = Ajsf.digObject(app, cpyAttr[styleClass]);

				if (value) {
					if (!$e.hasClass(styleClass)) {
						$e.addClass(styleClass);
					}
				} else {
					$e.removeClass(styleClass);
				}
			}
		});

		el.find(prefix + '[ajsf-style]').each(function(i, e) {
			var $e = $(e);
			var cpyAttr = Ajsf.convertToObject($e.attr('ajsf-style'));

			for (var style in cpyAttr) {
				var value = Ajsf.digObject(app, cpyAttr[style]);

				$e.each(function(j, jel) {
					if (value) {
						jel.style[style] = value;
					} else {
						jel.style[style] = '';
					}
				});
			}
		});

		if (id === undefined) {
			el.find(prefix + '[ajsf-repeated' + suffix +']').each(function(i, e) {
				$(e).remove();
			});
		}

		el.find(prefix + '[ajsf-title' + suffix + ']').each(function(i, e) {
			var $e = $(e);
			var cpyAttr = attr;
			if (suffix === '') {
				cpyAttr = $e.attr('ajsf-title');
			}
			$e.attr('title', Ajsf.digObject(app, cpyAttr));
		});

		el.find(prefix + '[ajsf-text' + suffix + ']').each(function(i, e) {
			var $e = $(e);
			var cpyAttr = attr;
			if (suffix === '') {
				cpyAttr = $e.attr('ajsf-text');
			}
			$e.text(Ajsf.digObject(app, cpyAttr));
		});

		el.find(prefix + '[ajsf-repeat' + suffix + ']').each(function(i, e) {
			var $e = $(e);
			var customAttr = attr;
			$e.hide();
			if (suffix === '') {
				customAttr = $e.attr('ajsf-repeat');
			}
			var arr = Ajsf.digObject(app, customAttr);
			var isOption = $e.prop('tagName') === 'OPTION';
			if (arr !== undefined) {
				for (var item in arr) {
					var identifier = Ajsf.randomString(6);
					var $clone = $e.clone().removeAttr('ajsf-repeat').attr('ajsf-repeated', isOption ? identifier : 'true').show().insertBefore($e);

					var subapp = {
						context: {
							parent: function() {
								return app.context;
							},
							root: function() {
								var result = subapp.context;
								while (typeof result.parent === 'function') {
									result = result.parent();
								}
								return result;
							},
							item: arr[item]
						},
						directives: app.directives,
						filters: app.filters,
						attributes: app.attributes
					};

					if (typeof subapp.context.item === 'object') {
						subapp.context.item.index = item;
					}
					Ajsf.init(subapp, $clone, isOption ? identifier : undefined);
				}
				if (isOption) {
					var $parent = $e.parent();
					if ($parent.attr('ajsf-bind')) {
						var attr = $parent.attr('ajsf-bind');
						Ajsf.setVal($parent[0], Ajsf.digObject(app, attr));
					}
				}
			}
		});

		for (var name in app.attributes) {
			el.find(prefix + '[' + name + suffix + ']').each(function(i, e) {
				var customAttr = attr;
				if (suffix === '') {
					customAttr = $(e).attr(name);
				}
				app.attributes[name].definition(e, Ajsf.digObject(app, customAttr), app.context);
			});
		}

		for (var name in app.directives) {
			if (app.context.directiveInstances === undefined) {
				app.context.directiveInstances = [];
			}
			var directive = app.directives[name];

			var applyDirective = function(e) {
				var $e = $(e);

				var modelAttr = $e.attr('ajsf-model'), model = undefined;
				if (modelAttr !== null) {
					var model =  Ajsf.digObject(app, modelAttr);
				}

				$e.html(directive.template);

				var subapp = {
					context: {
						model: model,
						parent: function() {
							return app.context;
						},
						root: function() {
							var result = subapp.context;
							while (typeof result.parent === 'function') {
								result = result.parent();
							}
							return result;
						},
						refresh: function(skipOnRefresh) {
							if (!skipOnRefresh && typeof subapp.context.onRefresh === 'function')
							{
								subapp.context.onRefresh();
							}
							Ajsf.refresh(subapp, $e);
						}
					},
					directives: app.directives,
					filters: app.filters,
					attributes: app.attributes,
					element: e
				};

				app.context.directiveInstances.push(subapp);
				if (directive.definition !== undefined) {
					subapp.context = Object.assign(subapp.context, directive.definition(subapp.context, e));
				}
				Ajsf.init(subapp, $e);
			};

			if (el.prop('tagName') === name.toUpperCase() && (el.attr('ajsf-repeat') !== null || el.attr('ajsf-repeated') !== null)) {
				if (el.html() === '') {
					applyDirective(el[0]);
				}
			} else {
				el.find(name).each(function(i, e) {
					var $e = $(e);
					if ($e.html() === '' && $e.attr('ajsf-repeat') === null && $e.attr('ajsf-repeated') === null) {
						applyDirective(e);
					}
				});
			}
		}
		if (app.context.directiveInstances !== undefined && app.context.directiveInstances.length > 0) {
			for (var i = app.context.directiveInstances.length - 1; i >= 0; i--) {
				if (app.context.directiveInstances[i] === undefined || (app.context.directiveInstances[i].element !== undefined && !document.body.contains(app.context.directiveInstances[i].element))) {
					app.context.directiveInstances.splice(i, 1);
				}
			}
			for (var i in app.context.directiveInstances) {
				if (app.context.directiveInstances[i] !== undefined && app.context.directiveInstances[i].context !== undefined) {
					app.context.directiveInstances[i].context.refresh();
				}

			}
		}
	},
	getVal: function(e) {
		var $e = $(e);
		switch ($e.prop('type')) {
			case 'checkbox':
				return $e.prop('checked');
			case 'radio':
				var attr = $e.attr('ajsf-bind');
				var arr = $('input[ajsf-bind=' + attr +'][type=radio]');
				for (var i = 0; i <= arr.length; i++) {
					$e = $(arr[i]);
					if ($e.prop('checked')) {
						return $e.val();
					}
				}
				return null;
			default:
				return $e.val();
		}
	},
	setVal: function(e, value) {
		var $e = $(e);
		if ($e.prop('tagName') === 'INPUT') {
			switch ($e.prop('type')) {
				case 'checkbox':
					$e.prop('checked', value);
					break;
				case 'radio':
					$e.prop('checked', e.value == value);
					break;
				default:
					$e.val(value);
			}
		} else if ($e.prop('tagName') === 'TEXTAREA' || $e.prop('tagName') === 'SELECT') {
			$e.val(value);
		} else if ($e.prop('tagName') === 'OPTION') {
			$e.attr('value', value);
			$e.text(value);
		} else {
			$e.text(value);
		}
	}
};

window.ajsf = function(selector, definition) {
	var root = $('[ajsf="' + selector + '"]');

	var instance = {
		context: {
			rootElement = root[0]
		},
		directives: {},
		directive: function(name, template, definition) {
			this.directives[name] = {
				'name': name,
				'template': template,
				'definition': definition
			};
		},
		filters: {},
		filter: function(name, definition) {
			this.filters[name] = {
				'name': name,
				'definition': definition
			};
		},
		attributes: {},
		attribute: function(name, definition) {
			this.attributes[name] = {
				'name': name,
				'definition': definition
			};
		}
	};

	instance.context.refresh = function() {
		Ajsf.refresh(instance, root);
	};

	instance.context = Object.assign(instance.context, definition(instance.context, root[0]));

	instance.context.rootElement = root[0];

	$(document).ready(function() {
		Ajsf.init(instance, root);
	});

	return instance;
};