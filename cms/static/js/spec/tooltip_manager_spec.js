define(['jquery', 'js/tooltip_manager'], function ($, TooltipManager) {
    'use strict';
    var PAGE_X = 100, PAGE_Y = 100, WIDTH = 100, HEIGHT = 100, DELTA = 10;

    beforeEach(function () {
        setFixtures(sandbox({
          'id': 'test-id',
          'data-tooltip': 'some text here.'
        }));
        this.element = $('#test-id');
        jasmine.Clock.useMock();
        this.tooltip = new TooltipManager();
        // Set default dimensions to make testing easer.
        $('.tooltip').height(HEIGHT).width(WIDTH);
    });

    afterEach(function () {
        this.tooltip.destroy();
    });

    describe('TooltipManager', function () {
        var showTooltip = function (element) {
            element.trigger($.Event("mouseover", {
                pageX: PAGE_X,
                pageY: PAGE_Y
            }));
            jasmine.Clock.tick(500);
            expect($('.tooltip')).toBeVisible();
        };

        it('should be shown when mouse is over the element', function () {
            showTooltip(this.element);
            expect($('.tooltip').text()).toBe('some text here.');
        });

        it('should be hidden when mouse is out of the element', function () {
            showTooltip(this.element);
            this.element.trigger($.Event("mouseout"));
            expect($('.tooltip')).toBeHidden();
        });

        it('should be hidden when user clicks on the element', function () {
            showTooltip(this.element);
            this.element.trigger($.Event("click"));
            expect($('.tooltip')).toBeHidden();
        });

        it('should moves correctly', function () {
            showTooltip(this.element);
            // PAGE_X - 0.5 * WIDTH
            // 100 - 0.5 * 100 = 50
            expect(parseInt($('.tooltip').css('left'))).toBe(50);
            // PAGE_Y - (HEIGHT + 15)
            // 100 - (100 + 15) = -15
            expect(parseInt($('.tooltip').css('top'))).toBe(-15);
            this.element.trigger($.Event("mousemove", {
                pageX: PAGE_X + DELTA,
                pageY: PAGE_Y + DELTA
            }));
            // PAGE_X + DELTA - 0.5 * WIDTH
            // 100 + 10 - 0.5 * 100 = 60
            expect(parseInt($('.tooltip').css('left'))).toBe(60);
            // PAGE_Y + DELTA - (HEIGHT + 15)
            // 100 + 10 - (100 + 15) = -5
            expect(parseInt($('.tooltip').css('top'))).toBe(-5);
        });
    });
});
