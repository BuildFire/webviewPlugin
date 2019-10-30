(function(angular, buildfire) {
	var webviewPluginApp = angular.module('webviewPlugin', []);

	webviewPluginApp.controller('webviewPluginCtrl', ['$scope', '$log', '$timeout', controller]);

	function controller($scope, $log, $timeout) {
		var dataChanged = false;
		$scope.datastoreInitialized = false;
		$scope.urlValid = false;
		$scope.urlInValid = false;
		$scope.viewType = {
			NATIVE_IN_APP: 'Native In App',
			IN_APP_POPUP: 'In app popup',
			EXTERNAL_BROWSER: 'External browser'
		};

		buildfire.datastore.get(function(err, result) {
			if (err) return console.error('Error: ', err);

			$scope.datastoreInitialized = true;

			if (isValidResult(result)) {
				$scope.data = result.data;
				$scope.id = result.id;

				var type = typeof result.data.content.openInApp;

				if (type != 'undefined' && type != 'object') {
					if (result.data.content.openInApp) {
						$scope.data.content.view = $scope.viewType.NATIVE_IN_APP;
					} else {
						$scope.data.content.view = $scope.viewType.IN_APP_POPUP;
					}
				}
			} else {
				$scope.data = {
					content: {
						url: '',
						view: $scope.viewType.NATIVE_IN_APP
					}
        };
        localStorage.removeItem('webview_modal-shown');
			}

			$scope.$watch('data', watchFn, true);
			function watchFn(newObj, oldObj) {
				if (angular.equals(newObj, oldObj) || newObj == undefined) {
					dataChanged = false;
				} else {
					dataChanged = true;
				}
      }

			if (!$scope.$$phase && !$scope.$root.$$phase) {
				$scope.$apply();
			}

			function isValidResult(res) {
				return res && res.data && !angular.equals({}, res.data) && res.id;
			}
		});
		buildfire.messaging.onReceivedMessage = function (message) {
			buildfire.messaging.sendMessageToWidget(message);
		};

		$scope.saveData = function() {
			if (!$scope.datastoreInitialized) {
				return console.error("Error with datastore didn't get called");
			}

			if (!dataChanged) {
				return console.warn("data didn't change");
			}

			if ($scope.frmMain.$invalid) return setDataInvalid();

			var data = $scope.data;
			dataChanged = false;

			setDataValid();

			if (!/^https?\:\/\//.test(data.content.url)) {
				data.content.url = 'http://' + data.content.url;
			}

			if (data.content.openInApp != undefined) {
				data.content.openInApp = null;
			}

			buildfire.datastore.save(data, function(err, result) {
				if (err || !result) {
					return $log.error('Error saving the widget details: ', err);
				}

				$log.info('Widget details saved');
			});

			function setDataInvalid() {
				$log.warn('invalid data, details will not be saved');
				$scope.urlValid = false;
				$scope.urlInValid = true;
				$timeout(function() {
					$scope.urlInValid = false;
				}, 3000);
			}

			function setDataValid() {
				$scope.urlValid = true;
				$scope.urlInValid = false;
				$timeout(function() {
					$scope.urlValid = false;
				}, 3000);
			}
		};

		$scope.validateUrl = function() {
			$scope.saveData();
		};

		$scope.changeViewType = function() {
      dataChanged = true;
      
      if ($scope.frmMain.$invalid) return;

      var data = $scope.data;

      if (data.content.openInApp != undefined) {
        data.content.openInApp = null;
      }
      buildfire.datastore.save(data, function(err, result) {
        if (err || !result) {
          $log.error('Error saving the widget details: ', err);
        } else {
          $log.info('Widget details saved');
        }
      });
		};

		$scope.openMethodChanged = function() {
			dataChanged = true;
			buildfire.datastore.save($scope.data, function(err, result) {
				if (err || !result) {
					$log.error('Error saving the widget details: ', err);
				} else {
					$log.info('Widget details saved');
				}
			});
		};

		$scope.isUrlValid = function(url) {
			return /[-a-zA-Z0-9@:%_\+.~#?&amp;//=]{2,256}\.[a-z]{2,6}\b(\/[-a-zA-Z0-9@:%_\+.~#?!?\/?\w\/?&amp;//=]*)?/.test(url);
		};
	}
})(window.angular, window.buildfire);
