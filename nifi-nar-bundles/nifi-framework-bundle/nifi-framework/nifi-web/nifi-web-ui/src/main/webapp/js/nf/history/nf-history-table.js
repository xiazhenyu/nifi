/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global nf, Slick */

nf.HistoryTable = (function () {

    /**
     * Configuration object used to hold a number of configuration items.
     */
    var config = {
        defaultStartTime: '00:00:00',
        defaultEndTime: '23:59:59',
        filterText:nf._.msg('nf-history-table.Filter'),
        styles: {
            filterList: 'filter-list',
            hidden: 'hidden'
        },
        urls: {
            history: '../nifi-api/controller/history'
        }
    };

    /**
     * Initializes the details dialog.
     */
    var initDetailsDialog = function () {
        $('#action-details-dialog').modal({
            headerText:nf._.msg('nf-history-table.ActionDetail'),
            overlayBackground: false,
            buttons: [{
                    buttonText:nf._.msg('nf-history-table.Ok'),
                    handler: {
                        click: function () {
                            $('#action-details-dialog').modal('hide');
                        }
                    }
                }],
            handler: {
                close: function () {
                    // clear the details
                    $('#action-details').empty();
                }
            }
        });
    };

    /**
     * Initializes the filter dialog.
     */
    var initFilterDialog = function () {
        // clear the filter field
        $('#history-filter').val('');

        // filter type
        $('#history-filter-type').combo({
            options: [{
                    text:nf._.msg('nf-history-table.ById'),
                    value: 'by id',
                    description:nf._.msg('nf-history-table.Message1')
                }, {
                    text:nf._.msg('nf-history-table.ByUser'),
                    value: 'by user',
                    description:nf._.msg('nf-history-table.Message2')
                }]
        });

        // configure the start and end date picker
        $('#history-filter-start-date, #history-filter-end-date').datepicker({
            showAnim: '',
            showOtherMonths: true,
            selectOtherMonths: true
        });
        $('#history-filter-start-date').datepicker('setDate', '-14d');
        $('#history-filter-end-date').datepicker('setDate', '+0d');

        // initialize the start and end time
        $('#history-filter-start-time').val(config.defaultStartTime);
        $('#history-filter-end-time').val(config.defaultEndTime);

        // configure the filter dialog
        $('#history-filter-dialog').modal({
            headerText:nf._.msg('nf-history-table.FilterHistory'),
            overlayBackground: false,
            buttons: [{
                    buttonText:nf._.msg('nf-history-table.Filter'),
                    handler: {
                        click: function () {
                            $('#history-filter-dialog').modal('hide');

                            var filter = {};

                            // extract the filter text
                            var filterText = $('#history-filter').val();
                            if (filterText !== '') {
                                var filterType = $('#history-filter-type').combo('getSelectedOption').text;
                                if (filterType === 'by id') {
                                    filter['sourceId'] = filterText;
                                } else if (filterType === 'by user') {
                                    filter['userName'] = filterText;
                                }
                            }

                            // extract the start date time
                            var startDate = $.trim($('#history-filter-start-date').val());
                            var startTime = $.trim($('#history-filter-start-time').val());
                            if (startDate !== '') {
                                if (startTime === '') {
                                    startTime = config.defaultStartTime;
                                    $('#history-filter-start-time').val(startTime);
                                }
                                filter['startDate'] = startDate + ' ' + startTime;
                            }

                            // extract the end date time
                            var endDate = $.trim($('#history-filter-end-date').val());
                            var endTime = $.trim($('#history-filter-end-time').val());
                            if (endDate !== '') {
                                if (endTime === '') {
                                    endTime = config.defaultEndTime;
                                    $('#history-filter-end-time').val(endTime);
                                }
                                filter['endDate'] = endDate + ' ' + endTime;
                            }

                            // set the filter
                            var historyGrid = $('#history-table').data('gridInstance');
                            var historyModel = historyGrid.getData();
                            historyModel.setFilterArgs(filter);

                            // reload the table
                            nf.HistoryTable.loadHistoryTable();
                        }
                    }
                }, {
                    buttonText:nf._.msg('nf-history-table.Cancel'),
                    handler: {
                        click: function () {
                            $('#history-filter-dialog').modal('hide');
                        }
                    }
                }]
        });
    };

    /**
     * Initializes the purge dialog.
     */
    var initPurgeDialog = function () {
        // configure the start and end date picker
        $('#history-purge-end-date').datepicker({
            showAnim: '',
            showOtherMonths: true,
            selectOtherMonths: true
        });
        $('#history-purge-end-date').datepicker('setDate', '-1m');

        // initialize the start and end time
        $('#history-purge-end-time').val(config.defaultStartTime);

        // configure the filter dialog
        $('#history-purge-dialog').modal({
            headerText:nf._.msg('nf-history-table.PurgeHistory'),
            overlayBackground: false,
            buttons: [{
                    buttonText:nf._.msg('nf-history-table.Purge'),
                    handler: {
                        click: function () {
                            // hide the dialog
                            $('#history-purge-dialog').modal('hide');

                            // get the purge end date
                            var endDate = $.trim($('#history-purge-end-date').val());
                            var endTime = $.trim($('#history-purge-end-time').val());
                            if (endDate !== '') {
                                if (endTime === '') {
                                    endTime = config.defaultStartTime;
                                    $('#history-purge-end-time').val(endTime);
                                }
                                var endDateTime = endDate + ' ' + endTime;
                                var timezone = $('.timezone:first').text();
                                nf.Dialog.showYesNoDialog({
                                    dialogContent: "Are you sure you want to delete all history before '" + nf.Common.escapeHtml(endDateTime) + " " + nf.Common.escapeHtml(timezone) + "'?",
                                    overlayBackground: false,
                                    yesHandler: function () {
                                        purgeHistory(endDateTime);
                                    }
                                });
                            } else {
                                nf.Dialog.showOkDialog({
                                    dialogContent: nf._.msg('nf-history-table.Message4'),
                                    overlayBackground: false
                                });
                            }
                        }
                    }
                }, {
                    buttonText:nf._.msg('nf-history-table.Cancel'),
                    handler: {
                        click: function () {
                            $('#history-purge-dialog').modal('hide');
                        }
                    }
                }]
        });
    };

    /**
     * Initializes the history table.
     */
    var initHistoryTable = function () {
        // listen for browser resize events to update the page size
        $(window).resize(function () {
            nf.HistoryTable.resetTableSize();
        });

        // clear the current filter
        $('#clear-history-filter').click(function () {
            // clear the filter dialog
            $('#history-filter').val('');
            
            // hide the overview
            $('#history-filter-overview').hide();

            // clear the filter
            var historyGrid = $('#history-table').data('gridInstance');
            var historyModel = historyGrid.getData();
            historyModel.setFilterArgs({});

            // refresh the table
            nf.HistoryTable.loadHistoryTable();
        });

        // add hover effect and click handler for opening the dialog
        nf.Common.addHoverEffect('#history-filter-button', 'button-normal', 'button-over').click(function () {
            $('#history-filter-dialog').modal('show');
        });

        // define a custom formatter for the more details column
        var moreDetailsFormatter = function (row, cell, value, columnDef, dataContext) {
            return '<img src="images/iconDetails.png" title='+nf._.msg('nf-history-table.ViewDetails')+' class="pointer show-action-details" style="margin-top: 4px;"/>';
        };

        // initialize the templates table
        var historyColumns = [
            {id: 'moreDetails', name: '&nbsp;', sortable: false, resizable: false, formatter: moreDetailsFormatter, width: 50, maxWidth: 50},
            {id: 'timestamp', name: nf._.msg('nf-history-table.DateTime'), field: 'timestamp', sortable: true, resizable: true},
            {id: 'sourceName', name: nf._.msg('nf-history-table.Name'), field: 'sourceName', sortable: true, resizable: true},
            {id: 'sourceType', name: nf._.msg('nf-history-table.Type'), field: 'sourceType', sortable: true, resizable: true},
            {id: 'operation', name: nf._.msg('nf-history-table.Operation'), field: 'operation', sortable: true, resizable: true},
            {id: 'userName', name: nf._.msg('nf-history-table.User'), field: 'userName', sortable: true, resizable: true}
        ];
        var historyOptions = {
            forceFitColumns: true,
            enableTextSelectionOnCells: true,
            enableCellNavigation: false,
            enableColumnReorder: false,
            autoEdit: false
        };

        // create the remote model
        var historyModel = new nf.HistoryModel();

        // initialize the grid
        var historyGrid = new Slick.Grid('#history-table', historyModel, historyColumns, historyOptions);
        historyGrid.setSelectionModel(new Slick.RowSelectionModel());
        historyGrid.registerPlugin(new Slick.AutoTooltips());

        // initialize the grid sorting
        historyGrid.onSort.subscribe(function (e, args) {
            // set the sort criteria on the model
            historyModel.setSort(args.sortCol.field, args.sortAsc ? 1 : -1);

            // reload the grid
            var vp = historyGrid.getViewport();
            historyModel.ensureData(vp.top, vp.bottom);
        });
        historyGrid.setSortColumn('timestamp', false);

        // configure a click listener
        historyGrid.onClick.subscribe(function (e, args) {
            var target = $(e.target);

            // get the node at this row
            var item = historyModel.getItem(args.row);

            // determine the desired action
            if (historyGrid.getColumns()[args.cell].id === 'moreDetails') {
                if (target.hasClass('show-action-details')) {
                    showActionDetails(item);
                }
            }
        });

        // listen for when the viewport changes so we can fetch the appropriate records
        historyGrid.onViewportChanged.subscribe(function (e, args) {
            var vp = historyGrid.getViewport();
            historyModel.ensureData(vp.top, vp.bottom);
        });

        // listen for when new data has been loaded
        historyModel.onDataLoaded.subscribe(function (e, args) {
            for (var i = args.from; i <= args.to; i++) {
                historyGrid.invalidateRow(i);
            }
            historyGrid.updateRowCount();
            historyGrid.render();
        });

        // hold onto an instance of the grid
        $('#history-table').data('gridInstance', historyGrid);

        // add the purge button if appropriate
        if (nf.Common.isAdmin()) {
            $('#history-purge-button').on('click', function () {
                $('#history-purge-dialog').modal('show');
            }).show();
        }
    };

    /**
     * Purges the history up to the specified end date.
     * 
     * @argument {string} endDateTime       The end date time
     */
    var purgeHistory = function (endDateTime) {
        $.ajax({
            type: 'DELETE',
            url: config.urls.history + '?' + $.param({
                endDate: endDateTime
            }),
            dataType: 'json'
        }).done(function () {
            nf.HistoryTable.loadHistoryTable();
        }).fail(nf.Common.handleAjaxError);
    };
    
    /**
     * Shows the details for the specified action.
     * 
     * @param {object} action
     */
    var showActionDetails = function (action) {
        // create the markup for the dialog
        var detailsMarkup = $('<div></div>').append(
                $('<div class="action-detail"><div class="history-details-name">Id</div>' + nf.Common.escapeHtml(action.sourceId) + '</div>'));

        // get any component details
        var componentDetails = action.componentDetails;

        // inspect the operation to determine if there are any component details
        if (nf.Common.isDefinedAndNotNull(componentDetails)) {
            if (action.sourceType === 'Processor' || action.sourceType === 'ControllerService' || action.sourceType === 'ReportingTask') {
                detailsMarkup.append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.Type')+'</div>' + nf.Common.escapeHtml(componentDetails.type) + '</div>'));
            } else if (action.sourceType === 'RemoteProcessGroup') {
                detailsMarkup.append(
                        $('<div class="action-detail"><div class="history-details-name">Uri</div>' + nf.Common.formatValue(componentDetails.uri) + '</div>'));
            }
        }

        // get any action details
        var actionDetails = action.actionDetails;

        // inspect the operation to determine if there are any action details
        if (nf.Common.isDefinedAndNotNull(actionDetails)) {
            if (action.operation === 'Configure') {
                detailsMarkup.append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.Name')+'</div>' + nf.Common.formatValue(actionDetails.name) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.Value')+'</div>' + nf.Common.formatValue(actionDetails.value) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.PreviousValue')+'</div>' + nf.Common.formatValue(actionDetails.previousValue) + '</div>'));
            } else if (action.operation === 'Connect' || action.operation === 'Disconnect') {
                detailsMarkup.append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.SourceId')+'</div>' + nf.Common.escapeHtml(actionDetails.sourceId) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.SourceName')+'</div>' + nf.Common.formatValue(actionDetails.sourceName) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.SourceType')+'</div>' + nf.Common.escapeHtml(actionDetails.sourceType) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.Relationship')+'</div>' + nf.Common.formatValue(actionDetails.relationship) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.DestinationId')+'</div>' + nf.Common.escapeHtml(actionDetails.destinationId) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.DestinationName')+'</div>' + nf.Common.formatValue(actionDetails.destinationName) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.DestinationType')+'</div>' + nf.Common.escapeHtml(actionDetails.destinationType) + '</div>'));
            } else if (action.operation === 'Move') {
                detailsMarkup.append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.Group')+'</div>' + nf.Common.formatValue(actionDetails.group) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.GroupId')+'</div>' + nf.Common.escapeHtml(actionDetails.groupId) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.PreviousGroup')+'</div>' + nf.Common.formatValue(actionDetails.previousGroup) + '</div>')).append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.PreviousGroupId')+'</div>' + nf.Common.escapeHtml(actionDetails.previousGroupId) + '</div>'));
            } else if (action.operation === 'Purge') {
                detailsMarkup.append(
                        $('<div class="action-detail"><div class="history-details-name">'+nf._.msg('nf-history-table.EndDate')+'</div>' + nf.Common.escapeHtml(actionDetails.endDate) + '</div>'));
            }
        }

        // populate the dialog
        $('#action-details').append(detailsMarkup);

        // show the dialog
        $('#action-details-dialog').modal('show');
    };

    return {
        init: function () {
            initDetailsDialog();
            initFilterDialog();
            initPurgeDialog();
            initHistoryTable();
        },
        
        /**
         * Update the size of the grid based on its container's current size.
         */
        resetTableSize: function () {
            var historyGrid = $('#history-table').data('gridInstance');
            if (nf.Common.isDefinedAndNotNull(historyGrid)) {
                historyGrid.resizeCanvas();
            }
        },
        
        /**
         * Load the processor status table.
         */
        loadHistoryTable: function () {
            var historyGrid = $('#history-table').data('gridInstance');

            // clear the history model
            var historyModel = historyGrid.getData();
            historyModel.clear();

            // request refresh of the current 'page'
            historyGrid.onViewportChanged.notify();
        }
    };
}());
