/**
	ajsf 0.0.1

	https://github.com/tvrzna/ajsf
**/
Ajsf = {
	init: function(app, el) {
		el.find('[ajsf-bind]').each(function(i, e) {
			var $e = $(e);
			var attr = $e.attr('ajsf-bind');

			if (Ajsf.digObject(app, attr) === undefined) {
				Ajsf.digObject(app, attr, '');
			}
			if ($e.prop('tagName') === 'INPUT' || $e.prop('tagName') === 'TEXTAREA' || $e.prop('tagName') === 'SELECT') {
				var event;
				if ($e.prop('tagName') === 'TEXTAREA') {
					event = "input";
				} else {
					switch ($e.prop('type')) {
						case "text":
						case "password":
						case "email":
						case "url":
						case "search":
						case "number":
							event = "input";
							break;
						case "submit":
							break;
						default:
							event = "change";
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
					fce[0](event, ...fce[1], $(this));
				});
			});
		};

		for (var attrEvent in Ajsf.basicEvents) {
			createEvent(attrEvent);
		}

		Ajsf.refresh(app, el);
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
	digObject: function(app, attr, val, addArgs) {
		var expression = attr.split('|');

		var attribute = expression[0].trim();
		var negative = false;
		var isStatic = false;
		var result;
		var args = [];

		if ((attribute.startsWith('\'') && attribute.endsWith('\'')) || (attribute.startsWith('"') && attribute.endsWith('"'))) {
			isStatic = true;
			result = attribute.substring(1, attribute.length - 1);
		}

		if (!isStatic) {
			if (attribute.startsWith('!')) {
				attribute = expression[0].substring(1).trim();
				negative = true;
			}

			if (addArgs && attribute.indexOf('(') >= 0 && attribute.lastIndexOf(')') >= attribute.indexOf('(')) {
				var strArgs = attribute.substring(attribute.indexOf('(') + 1, attribute.lastIndexOf(')'));
				attribute = attribute.substring(0, attribute.indexOf('('));

				var argRegex = /((\w+\(.*\))|(['"]?\w+['"]?)),?/g;
				var match;

				while((match = argRegex.exec(strArgs)) != null)
				{
					var fce = Ajsf.digObject(app, match[1], val, true);
					if (typeof fce[0] === 'function') {
						args.push(fce[0](...fce[1]));
					} else {
						args.push(fce[0]);
					}
				}
			}

			var indexRegex = /(.*?)\[([0-9]+)\]/g;
			var arr = attribute.split('.'), i = 0, obj = app.context;

			for(; i < arr.length - 1; i++) {
				var match = indexRegex.exec(arr[i]);
				if (match !== null && obj[match[1]][match[2]] !== undefined) {
					obj = obj[match[1]][match[2]];
				} else if (obj[arr[i]] !== undefined) {
					obj = obj[arr[i]];
				}
			}

			var match = indexRegex.exec(arr[i]);
			if (match !== null) {
				if (val !== undefined) {
					obj[match[1]][match[2]] = val;
					return;
				}
				result = obj[match[1]][match[2]];
			} else {
				if (val !== undefined) {
					obj[arr[i]] = val;
					return;
				}
				result = obj[arr[i]];
			}

			if (negative) {
				result = !result;
			}
		}

		for (var j = 1; j < expression.length; j++) {
			if (expression[j] != undefined) {
				result = Ajsf.filter(app, expression[j].trim(), result);
			}
		}

		if (addArgs)
		{
			return [result, args];
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
				if ((param.startsWith('\'') && param.endsWith('\'')) || (param.startsWith('"') && param.endsWith('"'))) {
					param = param.substring(1, param.length - 1);
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
			default:
				console.warn('Filter ' + method + ' is not implemented yet.')
				return value;
		}
	},
	refresh: function(app, el, attr) {
		var prefix = ':not([ajsf-repeated]) > ';
		if (el.is('[ajsf-repeated]')) {
			prefix = '';
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
			var cpyAttr = JSON.parse(JSON.stringify(eval('(' + $e.attr('ajsf-class') + ')')));

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

		el.find(prefix + '[ajsf-repeated' + suffix +']').each(function(i, e) {
			$(e).remove();
		});

		el.find(prefix + '[ajsf-title' + suffix + ']').each(function(i, e) {
			var $e = $(e);
			var cpyAttr = attr;
			if (suffix === '') {
				cpyAttr = $e.attr('ajsf-title');
			}
			$e.attr('title', Ajsf.digObject(app, cpyAttr));
		});

		el.find(prefix + '[ajsf-repeat' + suffix + ']').each(function(i, e) {
			var $e = $(e);
			var customAttr = attr;
			$e.hide();
			if (suffix === '') {
				customAttr = $e.attr('ajsf-repeat');
			}
			var arr = Ajsf.digObject(app, customAttr);
			if (arr !== undefined) {
				for (var item in arr) {
					var $clone = $e.clone().removeAttr('ajsf-repeat').attr('ajsf-repeated', 'true').show().insertBefore($e);

					var subapp = {
						context: {
							parent: function() {
								return app.context;
							},
							item: arr[item]
						},
						directives: app.directives,
						filters: app.filters,
						attributes: app.attributes
					};

					subapp.context.item.index = item;
					Ajsf.init(subapp, $clone);
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
						refresh: function(skipOnRefresh) {
							if (!skipOnRefresh && typeof subapp.context.onRefresh === "function")
							{
								subapp.context.onRefresh();
							}
							Ajsf.refresh(subapp, $e);
						}
					},
					directives: app.directives,
					filters: app.filters,
					attributes: app.attributes
				};

				if (directive.definition !== undefined) {
					subapp.context = Object.assign(subapp.context, directive.definition(subapp.context, e));
				}
				Ajsf.init(subapp, $e);
				app.context.directiveInstances.push(subapp);
			}

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
		for (var i in app.context.directiveInstances) {
			if (app.context.directiveInstances[i] !== undefined && app.context.directiveInstances[i].context !== undefined) {
				app.context.directiveInstances[i].context.refresh();
			}
		}
	},
	getVal: function(e) {
		var $e = $(e);
		switch ($e.prop('type')) {
			case "checkbox":
				return $e.prop('checked');
			case "radio":
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
				case "checkbox":
					$e.prop('checked', value);
					break;
				case "radio":
					$e.prop('checked', e.value == value);
					break;
				default:
					$e.val(value);
			}
		} else if ($e.prop('tagName') === 'TEXTAREA' || $e.prop('tagName') === 'SELECT') {
			$e.val(value);
		} else {
			$e.text(value);
		}
	}
};

window.ajsf = function(selector, definition) {
	var root = $('[ajsf="' + selector + '"]');

	var instance = {
		context: {},
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

	instance.context = Object.assign(instance.context, definition(instance.context));

	$(document).ready(function() {
		Ajsf.init(instance, root);
	});

	return instance;
};