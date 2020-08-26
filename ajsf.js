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
			if ($e.prop('tagName') === 'INPUT' || $e.prop('tagName') === 'TEXTAREA') {
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
		el.find('[ajsf-click]').each(function(i, e) {
			var $e = $(e);
			var attr = $e.attr('ajsf-click');

			$e.on('click', function(event) {
				Ajsf.digObject(app, attr)(event, e);
			});
		});

		el.find('[ajsf-keyup]').each(function(i, e) {
			var $e = $(e);
			var attr = $e.attr('ajsf-keyup');

			$e.on('keyup', function(event) {
				Ajsf.digObject(app, attr)(event, e);
			});
		});

		el.find('[ajsf-change]').each(function(i, e) {
			var $e = $(e);
			var attr = $e.attr('ajsf-change');

			$e.on('change', function(event) {
				Ajsf.digObject(app, attr)(event, e);
			});
		});
		Ajsf.refresh(app, el);
	},
	digObject: function(app, attr, val) {
		var expression = attr.split('|');

		var attribute = expression[0].trim();
		var negative = false;
		if (attribute.startsWith('!')) {
			attribute = expression[0].substring(1).trim();
			negative = true;
		}

		var indexRegex = /(.*?)\[([0-9]+)\]/g;
		var arr = attribute.split('.'), i = 0, obj = app.context, result;

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

		for (var j = 1; j < expression.length; j++) {
			if (expression[j] != undefined) {
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
				if ((param.startsWith('\'') && param.endsWith('\'')) || (param.startsWith('"') && param.endsWith('"'))) {
					param = param.substring(1, param.length - 1);
				} else if (!isNaN(param)) {
					param = Number(param);
				} else {
					param = Ajsf.digObject(app, param);
				}
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
			if (suffix === '') {
				attr = $(e).attr('ajsf-bind');
			}
			Ajsf.setVal(e, Ajsf.digObject(app, attr));
		});

		el.find(prefix + '[ajsf-hide' + suffix + ']').each(function(i, e) {
			var $e = $(e);

			if (suffix === '') {
				attr = $e.attr('ajsf-hide');
			}
			if (Ajsf.digObject(app, attr)) {
				$e.hide();
			} else {
				$e.show();
			}
		});

		el.find(prefix + '[ajsf-show' + suffix + ']').each(function(i, e) {
			var $e = $(e);

			if (suffix === '') {
				attr = $e.attr('ajsf-show');
			}
			if (Ajsf.digObject(app, attr)) {
				$e.show();
			} else {
				$e.hide();
			}
		});

		el.find(prefix + '[ajsf-class]').each(function(i, e) {
			var $e = $(e);
			attr = JSON.parse(JSON.stringify(eval('(' + $e.attr('ajsf-class') + ')')));

			for (var key in attr) {
				var value = Ajsf.digObject(app, key);

				if (value) {
					if (!$e.hasClass(attr[key])) {
						$e.addClass(attr[key]);
					}
				} else {
					$e.removeClass(attr[key]);
				}
			}
		});

		el.find(prefix + '[ajsf-repeated' + suffix +']').each(function(i, e) {
			$(e).remove();
		});

		el.find(prefix + '[ajsf-repeat' + suffix + ']').each(function(i, e) {
			var $e = $(e);
			$e.hide();
			if (suffix === '') {
				attr = $e.attr('ajsf-repeat');
			}
			var arr = Ajsf.digObject(app, attr);
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
						directives: app.directives
					};

					subapp.context.item.index = item;
					Ajsf.init(subapp, $clone);
				}
			}
		});

		for (var name in app.directives) {
			var directive = app.directives[name];

			var applyDirective = function(e) {
				$e = $(e);

				var modelAttr = $e.attr('ajsf-model'), model = undefined;
				if (modelAttr !== null) {
					var model =  Ajsf.digObject(app, modelAttr);
				}

				$e.html(directive.template);

				// FIXME: context is shared!
				var subapp = {
					context: {
						model: model,
						parent: function() {
							return app.context;
						},
						refresh: function() {
							Ajsf.refresh(subapp, $e);
						}
					},
					directives: app.directives
				};

				if (directive.definition !== undefined) {
					subapp.context = Object.assign(subapp.context, directive.definition(subapp.context, e));
				}
				Ajsf.init(subapp, $e);
			}

			if (el.prop('tagName') === name.toUpperCase() ||  el.attr('ajsf-repeat') !== null || el.attr('ajsf-repeated') !== null) {
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
		} else if ($e.prop('tagName') === 'SPAN' || $e.prop('tagName') === 'DIV' || $e.prop('tagName') === 'P' || $e.prop('tagName') === 'BUTTON') {
			$e.text(value);
		} else {
			console.warn('Report element ' + $e.prop('tagName') + ' was missed, please.');
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
				'template': template,
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