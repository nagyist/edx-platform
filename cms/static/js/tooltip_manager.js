define(['domReady', 'jquery'], function(domReady, $) {
    'use strict';
    var TooltipManager = function () {
        this.$body = $(document.body);
        this.tooltip = $('<div class="tooltip" />').hide().css('opacity', 0);
        this.tooltip.appendTo(this.$body);
        this.bindEvents();
    };

    TooltipManager.prototype = {
        bindEvents: function () {
            this.$body.on({
                'mouseover': this.showTooltip.bind(this),
                'mousemove': this.moveTooltip.bind(this),
                'mouseout': this.hideTooltip.bind(this),
                'click': this.hideTooltip.bind(this)
            }, '[data-tooltip]');
        },

        getCoords: function (pageX, pageY) {
            return {
                'left': pageX - 0.5 * this.tooltip.outerWidth(),
                'top': pageY - (this.tooltip.outerHeight() + 15)
            };
        },

        showTooltip: function(event) {
            var self = this,
                target = $(event.target).closest('[data-tooltip]'),
                tooltipText = target.attr('data-tooltip');

            this.tooltip
                .html(tooltipText)
                .css(this.getCoords(event.pageX, event.pageY));

            this.tooltipTimer = setTimeout(function() {
                self.tooltip.show().css('opacity', 1);
            }, 500);
        },

        moveTooltip: function(event) {
            this.tooltip.css(this.getCoords(event.pageX, event.pageY));
        },

        hideTooltip: function() {
            this.tooltip.hide().css('opacity', 0);
            clearTimeout(this.tooltipTimer);
        },

        destroy: function () {
            this.tooltip.remove();
            this.$body.off('[data-tooltip]');
        }
    };

    return TooltipManager;
}); // end require()
