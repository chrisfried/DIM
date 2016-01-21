(function() {
  'use strict';

  angular.module('dimApp')
    .directive('dimMovePopup', MovePopup);

  MovePopup.$inject = ['ngDialog'];

  function MovePopup(ngDialog) {
    return {
      controller: MovePopupController,
      controllerAs: 'vm',
      bindToController: true,
      restrict: 'A',
      scope: {
        store: '=dimStore',
        item: '=dimItem'
      },
      replace: true,
      template: [
        '<div class="move-popup" alt="" title="">',
        '  <div dim-move-item-properties="vm.item"></div>',
        '  <span ng-if="::vm.item.type === \'Bounties\'" class="bounty-description" ng-bind="::vm.item.description"></span>',
        '</div>'
      ].join('')
    };
  }

  MovePopupController.$inject = ['$scope', 'loadingTracker', 'dimStoreService', 'dimItemService', 'ngDialog', '$q', 'toaster'];

  function MovePopupController($scope, loadingTracker, dimStoreService, dimItemService, ngDialog, $q, toaster) {
    var vm = this;

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    vm.characterInfo = function characterInfo(store) {
      if (store.id === 'vault') {
        return 'Vault';
      } else {
        return store.level + ' ' + capitalizeFirstLetter(store.race) + ' ' + capitalizeFirstLetter(store.gender) + ' ' + capitalizeFirstLetter(store.class);
      }
    };

    // function moveItemUI(item, targetStore) {
    //   var sourceStore = (item.owner === targetStore.id) ? $q.when(targetStore) : dimStoreService.getStore(item.owner);
    //
    //   return sourceStore
    //     .then(function(sourceStore) {
    //       var i = _.indexOf(sourceStore.items, item);
    //
    //       if (i >= 0) {
    //         sourceStore.items.splice(i, 1);
    //         targetStore.items.push(item);
    //         item.owner = targetStore.id;
    //       }
    //     });
    // }

    /**
     * Move the item to the specified store. Equip it if equip is true.
     */
    vm.moveItemTo = function moveItemTo(store, equip) {
      var dimStores;
      var reload = vm.item.equipped || equip;
      var promise = dimItemService.moveTo(vm.item, store, equip);

      if (reload) {
        promise = promise.then(dimStoreService.getStores)
          .then(function(stores) {
            dimStores = stores;
            return dimStoreService.updateStores();
          })
          .then(function(bungieStores) {
            _.each(dimStores, function(dStore) {
              if (dStore.id !== 'vault') {
                var bStore = _.find(bungieStores, function(bStore) {
                  return dStore.id === bStore.id;
                });

                dStore.level = bStore.base.characterLevel;
                dStore.percentToNextLevel = bStore.base.percentToNextLevel;
                dStore.powerLevel = bStore.base.characterBase.powerLevel;
                dStore.background = bStore.base.backgroundPath;
                dStore.icon = bStore.base.emblemPath;
              }
            });
          });
      }

      promise = promise
        .then(function() {
          setTimeout(function() { dimStoreService.setHeights(); }, 0);
        })
        .catch(function(a) {
          toaster.pop('error', vm.item.name, a.message);
        });

      loadingTracker.addPromise(promise);
      $scope.$parent.closeThisDialog();
      return promise;
    };

    dimStoreService.getStores(false, true)
      .then(function(stores) {
        vm.stores = stores;
      });

    vm.canShowItem = function canShowItem(item, itemStore, buttonStore) {
      var result = false;
      // The item is in the vault
      if (item.id === 'vault') {
        if (buttonStore.id === 'vault') { // What to do about sending item back to the vault?
          return false;
        } else { // Send the item to another Guardian.

        }
      } else { // or, the item is in a guardian's inventory
        if (buttonStore.id === 'vault') { // What to do about sending item to the vault?

        } else if (buttonStore.id === item.owner) { // What to about using item with it's owner?

        } else { // Send the item to another Guardian.

        }
      }

      return result;
    };

    vm.canShowVault = function canShowButton(item, itemStore, buttonStore) {
      // If my itemStore is the vault, don't show a vault button.
      // Can't vault a vaulted item.
      if (itemStore.id === 'vault') {
        return false;
      }

      // If my buttonStore is the vault, then show a vault button.
      if (buttonStore.id !== 'vault') {
        return false;
      }

      // Can't move this item away from the current itemStore.
      if (item.notransfer) {
        return false;
      }

      return true;
    };

    vm.canShowStore = function canShowButton(item, itemStore, buttonStore) {
      if (buttonStore.id === 'vault') {
        return false;
      }

      if (!item.notransfer) {
        if (itemStore.id !== buttonStore.id) {
          return true;
        } else if (item.equipped) {
          return true;
        }
      } else {
        if (item.equipped && itemStore.id === buttonStore.id) {
          return true;
        }
      }

      return false;
    };

    vm.canShowEquip = function canShowButton(item, itemStore, buttonStore) {
      if (buttonStore.id === 'vault' || !item.equipment) {
        return false;
      }

      if (!item.notransfer) {
        if ((itemStore.id !== buttonStore.id) && (item.sort !== 'Postmaster')) {
          return true;
        } else if ((!item.equipped) && (item.sort !== 'Postmaster')) {
          return true;
        }
      } else {
        if ((!item.equipped) && (itemStore.id === buttonStore.id) && (item.sort !== 'Postmaster')) {
          return true;
        }
      }

      return false;
    };
  }
})();
