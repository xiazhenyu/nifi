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

/* global nf, d3 */

nf.RemoteProcessGroupConfiguration = (function () {
    return {
        init: function () {
            $('#remote-process-group-configuration').modal({
                headerText:nf._.msg('nf-remote-process-group-configuration.ConfigureRemoteProcessGroup'),
                overlayBackground: true,
                buttons: [{
                        buttonText:nf._.msg('nf-remote-process-group-configuration.Apply'),
                        handler: {
                            click: function () {
                                var remoteProcessGroupId = $('#remote-process-group-id').text();
                                var remoteProcessGroupData = d3.select('#id-' + remoteProcessGroupId).datum();

                                // create the remote process group details
                                var remoteProcessGroupEntity = {
                                    revision: nf.Client.getRevision(),
                                    remoteProcessGroup: {
                                        id: remoteProcessGroupId,
                                        communicationsTimeout: $('#remote-process-group-timeout').val(),
                                        yieldDuration: $('#remote-process-group-yield-duration').val()
                                    }
                                };

                                // update the selected component
                                $.ajax({
                                    type: 'PUT',
                                    data: JSON.stringify(remoteProcessGroupEntity),
                                    url: remoteProcessGroupData.component.uri,
                                    dataType: 'json',
                                    processData: false,
                                    contentType: 'application/json'
                                }).done(function (response) {
                                    // update the revision
                                    nf.Client.setRevision(response.revision);
                                    
                                    // refresh the remote process group component
                                    nf.RemoteProcessGroup.set(response.remoteProcessGroup);

                                    // close the details panel
                                    $('#remote-process-group-configuration').modal('hide');
                                }).fail(function (xhr, status, error) {
                                    if (xhr.status === 400) {
                                        var errors = xhr.responseText.split('\n');

                                        var content;
                                        if (errors.length === 1) {
                                            content = $('<span></span>').text(errors[0]);
                                        } else {
                                            content = nf.Common.formatUnorderedList(errors);
                                        }

                                        nf.Dialog.showOkDialog({
                                            dialogContent: content,
                                            overlayBackground: false,
                                            headerText:nf._.msg('nf-remote-process-group-configuration.ConfigurationError')
                                        });
                                    } else {
                                        nf.Common.handleAjaxError(xhr, status, error);
                                    }
                                });
                            }
                        }
                    }, {
                        buttonText:nf._.msg('nf-remote-process-group-configuration.Cancel'),
                        handler: {
                            click: function () {
                                $('#remote-process-group-configuration').modal('hide');
                            }
                        }
                    }],
                handler: {
                    close: function () {
                        // clear the remote process group details
                        $('#remote-process-group-id').text('');
                        $('#remote-process-group-name').text('');
                        $('#remote-process-group-url').text('');
                        $('#remote-process-group-timeout').val('');
                        $('#remote-process-group-yield-duration').val('');
                    }
                }
            }).draggable({
                containment: 'parent',
                handle: '.dialog-header'
            });
        },
        
        /**
         * Shows the details for the remote process group in the specified selection.
         * 
         * @argument {selection} selection      The selection
         */
        showConfiguration: function (selection) {
            // if the specified component is a remote process group, load its properties
            if (nf.CanvasUtils.isRemoteProcessGroup(selection)) {
                var selectionData = selection.datum();

                // populate the port settings
                $('#remote-process-group-id').text(selectionData.component.id);
                $('#remote-process-group-name').text(selectionData.component.name);
                $('#remote-process-group-url').text(selectionData.component.targetUri);

                // populate the text fields
                $('#remote-process-group-timeout').val(selectionData.component.communicationsTimeout);
                $('#remote-process-group-yield-duration').val(selectionData.component.yieldDuration);

                // show the details
                $('#remote-process-group-configuration').modal('show');
            }
        }
    };
}());
