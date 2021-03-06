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

/* global nf, top */

$(document).ready(function () {
    // initialize the status page
    nf.Provenance.init();
});

nf.Provenance = (function () {

    /**
     * Configuration object used to hold a number of configuration items.
     */
    var config = {
        urls: {
            cluster: '../nifi-api/cluster',
            banners: '../nifi-api/controller/banners',
            config: '../nifi-api/controller/config',
            controllerAbout: '../nifi-api/controller/about',
            authorities: '../nifi-api/controller/authorities'
        }
    };

    /**
     * Whether or not this NiFi is clustered.
     */
    var isClustered = null;

    /**
     * Determines if this NiFi is clustered.
     */
    var detectedCluster = function () {
        return $.Deferred(function (deferred) {
            $.ajax({
                type: 'HEAD',
                url: config.urls.cluster
            }).done(function () {
                isClustered = true;
                deferred.resolve();
            }).fail(function (xhr, status, error) {
                if (xhr.status === 404) {
                    isClustered = false;
                    deferred.resolve();
                } else {
                    nf.Common.handleAjaxError(xhr, status, error);
                    deferred.reject();
                }
            });
        }).promise();
    };

    /**
     * Loads the controller configuration.
     */
    var loadControllerConfig = function () {
        return $.ajax({
            type: 'GET',
            url: config.urls.config,
            dataType: 'json'
        }).done(function (response) {
            var config = response.config;

            // store the controller name
            $('#nifi-controller-uri').text(config.uri);

            // store the content viewer url if available
            if (!nf.Common.isBlank(config.contentViewerUrl)) {
                $('#nifi-content-viewer-url').text(config.contentViewerUrl);
            }
        }).fail(nf.Common.handleAjaxError);
    };

    /**
     * Loads the current users authorities.
     */
    var loadAuthorities = function () {
        return $.Deferred(function (deferred) {
            $.ajax({
                type: 'GET',
                url: config.urls.authorities,
                dataType: 'json'
            }).done(function (response) {
                if (nf.Common.isDefinedAndNotNull(response.authorities)) {
                    // record the users authorities
                    nf.Common.setAuthorities(response.authorities);
                    deferred.resolve(response);
                } else {
                    deferred.reject();
                }
            }).fail(function (xhr, status, error) {
                nf.Common.handleAjaxError(xhr, status, error);
                deferred.reject();
            });
        }).promise();
    };

    /**
     * Initializes the provenance page.
     */
    var initializeProvenancePage = function () {
        // define mouse over event for the refresh button
        nf.Common.addHoverEffect('#refresh-button', 'button-refresh', 'button-refresh-hover').click(function () {
            nf.ProvenanceTable.loadProvenanceTable();
        });

        // return a deferred for page initialization
        return $.Deferred(function (deferred) {
            // get the banners if we're not in the shell
            if (top === window) {
                $.ajax({
                    type: 'GET',
                    url: config.urls.banners,
                    dataType: 'json'
                }).done(function (response) {
                    // ensure the banners response is specified
                    if (nf.Common.isDefinedAndNotNull(response.banners)) {
                        if (nf.Common.isDefinedAndNotNull(response.banners.headerText) && response.banners.headerText !== '') {
                            // update the header text
                            var bannerHeader = $('#banner-header').text(response.banners.headerText).show();

                            // show the banner
                            var updateTop = function (elementId) {
                                var element = $('#' + elementId);
                                element.css('top', (parseInt(bannerHeader.css('height'), 10) + parseInt(element.css('top'), 10)) + 'px');
                            };

                            // update the position of elements affected by top banners
                            updateTop('provenance');
                        }

                        if (nf.Common.isDefinedAndNotNull(response.banners.footerText) && response.banners.footerText !== '') {
                            // update the footer text and show it
                            var bannerFooter = $('#banner-footer').text(response.banners.footerText).show();

                            var updateBottom = function (elementId) {
                                var element = $('#' + elementId);
                                element.css('bottom', parseInt(bannerFooter.css('height'), 10) + 'px');
                            };

                            // update the position of elements affected by bottom banners
                            updateBottom('provenance');
                        }
                    }

                    deferred.resolve();
                }).fail(function (xhr, status, error) {
                    nf.Common.handleAjaxError(xhr, status, error);
                    deferred.reject();
                });
            } else {
                deferred.resolve();
            }
        }).promise();
    };

    return {
        /**
         * Initializes the status page.
         */
        init: function () {
            nf.Storage.init();
            
            // load the users authorities and detect if the NiFi is clustered
            $.when(loadControllerConfig(), loadAuthorities(), detectedCluster()).done(function () {
                // create the provenance table
                nf.ProvenanceTable.init(isClustered).done(function () {
                    var search;
                    
                    // look for a processor id in the query search
                    var initialComponentId = $('#intial-component-query').text();
                    if ($.trim(initialComponentId) !== '') {
                        // populate initial search component
                        $('input.searchable-component-id').val(initialComponentId);
                        
                        // build the search criteria
                        search = {
                            'search[ProcessorID]': initialComponentId
                        };
                    }

                    // load the provenance table
                    nf.ProvenanceTable.loadProvenanceTable(search);

                    // once the table is initialized, finish initializing the page
                    initializeProvenancePage().done(function () {
                        // configure the initial grid height
                        nf.ProvenanceTable.resetTableSize();

                        // get the about details
                        $.ajax({
                            type: 'GET',
                            url: config.urls.controllerAbout,
                            dataType: 'json'
                        }).done(function (response) {
                            var aboutDetails = response.about;
                            var provenanceTitle = nf._.msg('nf-about') + nf._.msg('nf-provenance.DataProvenance');

                            // set the document title and the about title
                            document.title = provenanceTitle;
                            $('#provenance-header-text').text(provenanceTitle);
                        }).fail(nf.Common.handleAjaxError);
                    });
                });
            });
        }
    };
}());
