(function(angular, buildfire) {
    // 1. Create a new module for the settings section
    var webContentPluginSettingsApp = angular.module('webContentPluginSettings', []);

    // 2. Create the controller, injecting the necessary services
    webContentPluginSettingsApp.controller('webContentPluginSettingsCtrl', ['$scope', '$log', controller]);

    function controller($scope, $log) {
        var dataChanged = false;
        $scope.datastoreInitialized = false;

        // 3. Define the possible view types and subtypes
        $scope.viewType = {
            NATIVE_IN_APP: 'Native In App',
            IN_APP_POPUP: 'In app popup',
            EXTERNAL_BROWSER: 'External browser'
        };

        $scope.viewSubtype = {
            IFRAME: 'iFrame',
            NATIVE_WEBVIEW: 'Native webview'
        };

        // 4. Load existing data from the datastore
        buildfire.datastore.get(function(err, result) {
            if (err) return console.error('Error: ', err);

            $scope.datastoreInitialized = true;

            // Check if there is existing data
            if (result && result.data && !angular.equals({}, result.data) && result.id) {
                $scope.data = result.data;
                $scope.id = result.id;

                // Handle backward compatibility for older data structures
                if (typeof result.data.content.openInApp !== 'undefined' && typeof result.data.content.openInApp !== 'object') {
                    $scope.data.content.view = result.data.content.openInApp 
                        ? $scope.viewType.NATIVE_IN_APP 
                        : $scope.viewType.IN_APP_POPUP;
                }
                
                // Set default view if undefined
                if (!$scope.data.content.view) {
                    $scope.data.content.view = $scope.viewType.IN_APP_POPUP;
                }
                
                // If 'In Feature' is selected but no subtype is set, default to iFrame
                if ($scope.data.content.view === $scope.viewType.NATIVE_IN_APP && !$scope.data.content.viewSubtype) {
                    $scope.data.content.viewSubtype = $scope.viewSubtype.NATIVE_WEBVIEW;
                }
            } else {
                // Initialize with default data if none exists
                $scope.data = {
                    content: {
                        url: '',
                        view: $scope.viewType.IN_APP_POPUP,
                        viewSubtype: null
                    }
                };
            }

            // 5. Watch for any changes in the data model
            $scope.$watch('data', function(newObj, oldObj) {
                if (angular.equals(newObj, oldObj) || newObj === undefined) {
                    dataChanged = false;
                } else {
                    dataChanged = true;
                }
            }, true);

            if (!$scope.$$phase && !$scope.$root.$$phase) {
                $scope.$apply();
            }
        });

        // 6. Function to handle changes and save data
        $scope.changeViewType = function() {
            dataChanged = true;

            // When switching to 'In Feature', default to the iFrame subtype if not already set
            if ($scope.data.content.view === $scope.viewType.NATIVE_IN_APP && !$scope.data.content.viewSubtype) {
                $scope.data.content.viewSubtype = $scope.viewSubtype.NATIVE_WEBVIEW;
            }

            if ($scope.data.content.openInApp !== undefined) {
                $scope.data.content.openInApp = null;
            }

            // Save the updated data
            buildfire.datastore.save($scope.data, function(err, result) {
                if (err || !result) {
                    $log.error('Error saving the widget details: ', err);
                } else {
                    $log.info('Widget details saved');
                }
            });
        };
    }
})(window.angular, window.buildfire);