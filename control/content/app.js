var webviewPluginApp = angular.module('webviewPlugin', []);

webviewPluginApp.controller("webviewPluginCtrl", ["$scope", "$log", "$timeout", function ($scope, $log, $timeout) {
  var dataChanged = false;
  $scope.datastoreInitialized = false;
  $scope.urlValid = false;
  $scope.urlInValid = false;
  $scope.viewType = {
    NATIVE_IN_APP: 'Native In App',
    IN_APP_POPUP: 'In app popup',
    EXTERNAL_BROWSER: 'External browser'
  };
  /*
   * Go pull any previously saved data
   * */
  buildfire.datastore.get(function (err, result) {
    if (!err) {
      $scope.datastoreInitialized = true;
    } else {
      console.error("Error: ", err);
      return;
    }
    if (result && result.data && !angular.equals({}, result.data) && result.id) {
      $scope.data = result.data;
      $scope.id = result.id;
      if (typeof result.data.content.openInApp != 'undefined' && typeof result.data.content.openInApp != 'object') {
        if (result.data.content.openInApp)
          $scope.data.content.view = $scope.viewType.NATIVE_IN_APP;
        else
          $scope.data.content.view = $scope.viewType.IN_APP_POPUP;
      }
    } else {
      $scope.data = {
        content: {
          url: "http://hellacompany.com/",
          view: $scope.viewType.NATIVE_IN_APP
        }
      };
    }

    /*
     * watch for changes in data
     * */
    $scope.$watch('data', function (newObj, oldObj) {
      if (angular.equals(newObj, oldObj) || newObj == undefined) {
        dataChanged = false;
      } else {
        dataChanged = true;
      }
    }, true);

    if (!$scope.$$phase && !$scope.$root.$$phase) {
      $scope.$apply();
    }
  });

  $scope.saveData = function () {
    if (!$scope.datastoreInitialized) {
      console.error("Error with datastore didn't get called");
      return;
    }
    if (!dataChanged) {
      console.warn("data didn't changed");
      return;
    }
    var data = $scope.data;
    // if the form has some invalid data do not save, in our case the user eneter invalid URL
    if ($scope.frmMain.$invalid) {
      $log.warn('invalid data, details will not be saved');
      $scope.urlValid = false;
      $scope.urlInValid = true;
      $timeout(function () {
        $scope.urlInValid = false;
      }, 3000);
    } else {
      $scope.urlValid = true;
      $scope.urlInValid = false;
      $timeout(function () {
        $scope.urlValid = false;
      }, 3000);
      dataChanged = false;
      if (!/^https?\:\/\//.test(data.content.url)) {
        data.content.url = "http://" + data.content.url;
      }

      if (data.content.openInApp != undefined)
        data.content.openInApp = null;
      buildfire.datastore.save(data, function (err, result) {
        if (err || !result) {
          $log.error('Error saving the widget details: ', err);
        }
        else {
          $log.info('Widget details saved');
        }
      });
    }
  };

  $scope.validateUrl = function () {
    $scope.saveData();
  };

  $scope.changeViewType = function () {
    dataChanged = true;
    if (!$scope.frmMain.$invalid) {
      var data = $scope.data;
      console.log("***********save", data.content.openInApp);
      if (data.content.openInApp != undefined) {
        data.content.openInApp = null;
      }
      buildfire.datastore.save(data, function (err, result) {
        if (err || !result) {
          $log.error('Error saving the widget details: ', err);
        }
        else {
          $log.info('Widget details saved');
        }
      });
    }
  };

  $scope.openMethodChanged = function () {
    dataChanged = true;
    buildfire.datastore.save($scope.data, function (err, result) {
      if (err || !result) {
        $log.error('Error saving the widget details: ', err);
      }
      else {
        $log.info('Widget details saved');
      }
    });
  };
}]);