/**
 * Subviews (usually small side panels) for XBlockContainerPage.
 */
define(["jquery", "underscore", "gettext", "js/views/baseview", "js/views/utils/view_utils",
    "js/views/utils/xblock_utils"],
    function ($, _, gettext, BaseView, ViewUtils, XBlockViewUtils) {
        var VisibilityState = XBlockViewUtils.VisibilityState,
            disabledCss = "is-disabled";

        /**
         * A view that refreshes the view when certain values in the XBlockInfo have changed
         * after a server sync operation.
         */
        var ContainerStateListenerView = BaseView.extend({

            // takes XBlockInfo as a model
            initialize: function() {
                this.model.on('sync', this.onSync, this);
            },

            onSync: function(model) {
                if (this.shouldRefresh(model)) {
                   this.render();
                }
            },

            shouldRefresh: function(model) {
                return false;
            },

            render: function() {}
        });

        var MessageView = ContainerStateListenerView.extend({
            initialize: function () {
                ContainerStateListenerView.prototype.initialize.call(this);
                this.template = this.loadTemplate('container-message');
            },

            shouldRefresh: function(model) {
                return ViewUtils.hasChangedAttributes(model, ['currently_visible_to_students', 'has_changes']);
            },

            render: function() {
                this.$el.html(this.template({
                    currentlyVisibleToStudents: this.model.get('currently_visible_to_students'),
                    hasChanges: this.model.get('has_changes')
                }));
                return this;
            }
        });

        /**
         * A controller for updating the "View Live" and "Preview" buttons.
         */
        var PreviewActionController = ContainerStateListenerView.extend({
            shouldRefresh: function(model) {
                return ViewUtils.hasChangedAttributes(model, ['has_changes', 'published']);
            },

            render: function() {
                var previewAction = this.$el.find('.button-preview'),
                    viewLiveAction = this.$el.find('.button-view');
                if (this.model.get('published')) {
                    viewLiveAction.removeClass(disabledCss);
                }
                else {
                    viewLiveAction.addClass(disabledCss);
                }
                if (this.model.get('has_changes') || !this.model.get('published')) {
                    previewAction.removeClass(disabledCss);
                }
                else {
                    previewAction.addClass(disabledCss);
                }
            }
        });

        /**
         * Publisher is a view that supports the following:
         * 1) Publishing of a draft version of an xblock.
         * 2) Discarding of edits in a draft version.
         * 3) Display of who last edited the xblock, and when.
         * 4) Display of publish status (published, published with changes, changes with no published version).
         */
        var Publisher = BaseView.extend({
            events: {
                'click .action-publish': 'publish',
                'click .action-discard': 'discardChanges',
                'click .action-staff-lock': 'toggleStaffLock'
            },

            // takes XBlockInfo as a model

            initialize: function () {
                BaseView.prototype.initialize.call(this);
                this.template = this.loadTemplate('publish-xblock');
                this.model.on('sync', this.onSync, this);
                this.renderPage = this.options.renderPage;
            },

            onSync: function(model) {
                if (ViewUtils.hasChangedAttributes(model, [
                    'has_changes', 'published', 'edited_on', 'edited_by', 'visibility_state'
                ])) {
                   this.render();
                }
            },

            render: function () {
                this.$el.html(this.template({
                    visibilityState: this.model.get('visibility_state'),
                    visibilityClass: XBlockViewUtils.getXBlockVisibilityClass(this.model.get('visibility_state')),
                    hasChanges: this.model.get('has_changes'),
                    editedOn: this.model.get('edited_on'),
                    editedBy: this.model.get('edited_by'),
                    published: this.model.get('published'),
                    publishedOn: this.model.get('published_on'),
                    publishedBy: this.model.get('published_by'),
                    released: this.model.get('released_to_students'),
                    releaseDate: this.model.get('release_date'),
                    releaseDateFrom: this.model.get('release_date_from')
                }));

                return this;
            },

            publish: function (e) {
                if (e && e.preventDefault) {
                    e.preventDefault();
                }
                XBlockViewUtils.publishXBlock(this.model);
            },

            discardChanges: function (e) {
                var xblockInfo = this.model, renderPage = this.renderPage;
                if (e && e.preventDefault) {
                    e.preventDefault();
                }
                ViewUtils.confirmThenRunOperation(gettext("Discard Changes"),
                    gettext("Are you sure you want to revert to the last published version of the unit? You cannot undo this action."),
                    gettext("Discard Changes"),
                    function () {
                        ViewUtils.runOperationShowingMessage(gettext('Discarding Changes&hellip;'),
                            function () {
                                return xblockInfo.save({publish: 'discard_changes'}, {patch: true});
                            }).always(function() {
                                xblockInfo.set("publish", null);
                            }).done(function () {
                                renderPage();
                            });
                    }
                );
            },

            toggleStaffLock: function (e) {
                var xblockInfo = this.model, self=this, enableStaffLock,
                    saveAndPublishStaffLock, revertCheckBox;
                if (e && e.preventDefault) {
                    e.preventDefault();
                }
                enableStaffLock = xblockInfo.get('visibility_state') !== VisibilityState.staffOnly;

                revertCheckBox = function() {
                    self.checkStaffLock(!enableStaffLock);
                };

                saveAndPublishStaffLock = function() {
                    return xblockInfo.save({
                        publish: 'republish',
                        metadata: {visible_to_staff_only: enableStaffLock}},
                        {patch: true}
                    ).always(function() {
                        xblockInfo.set("publish", null);
                    }).done(function () {
                        xblockInfo.fetch();
                    }).fail(function() {
                        revertCheckBox();
                    });
                };

                this.checkStaffLock(enableStaffLock);
                if (enableStaffLock) {
                    ViewUtils.runOperationShowingMessage(gettext('Hiding Unit from Students&hellip;'),
                        _.bind(saveAndPublishStaffLock, self));
                } else {
                    ViewUtils.confirmThenRunOperation(gettext("Make Visible to Students"),
                        gettext("If you make this unit visible to students, students will be able to see its content after the release date has passed and you have published the unit. Do you want to proceed?"),
                        gettext("Make Visible to Students"),
                        function() {
                            ViewUtils.runOperationShowingMessage(gettext('Making Visible to Students&hellip;'),
                                _.bind(saveAndPublishStaffLock, self));
                        },
                        function() {
                            // On cancel, revert the check in the check box
                            revertCheckBox();
                        }
                    );
                }
            },

            checkStaffLock: function(check) {
                this.$('.action-staff-lock i').removeClass('icon-check icon-check-empty');
                this.$('.action-staff-lock i').addClass(check ? 'icon-check' : 'icon-check-empty');
            }
        });

        /**
         * PublishHistory displays when and by whom the xblock was last published, if it ever was.
         */
        var PublishHistory = BaseView.extend({
            // takes XBlockInfo as a model

            initialize: function () {
                BaseView.prototype.initialize.call(this);
                this.template = this.loadTemplate('publish-history');
                this.model.on('sync', this.onSync, this);
            },

            onSync: function(model) {
                if (ViewUtils.hasChangedAttributes(model, ['published', 'published_on', 'published_by'])) {
                   this.render();
                }
            },

            render: function () {
                this.$el.html(this.template({
                    published: this.model.get('published'),
                    published_on: this.model.get('published_on'),
                    published_by: this.model.get('published_by')
                }));

                return this;
            }
        });

        return {
            'MessageView': MessageView,
            'PreviewActionController': PreviewActionController,
            'Publisher': Publisher,
            'PublishHistory': PublishHistory
        };
    }); // end define();
