/*jshint -W027*/

(function() {
  'use strict';

  angular.module('dimApp')
    .directive('dimStoreHeading', StoreHeading);

  StoreHeading.$inject = ['ngDialog'];

  function StoreHeading(ngDialog) {
    return {
      controller: StoreHeadingCtrl,
      controllerAs: 'vm',
      bindToController: true,
      scope: {
        'store': '=storeData'
      },
      link: Link,
      template: [
        '<div class="character-box" ng-class="::{ \'vault-box\': !vm.isGuardian }" ng-style="{ \'background-image\': \'url(http://bungie.net\' + vm.store.background + \')\' }">',
        '  <div class="emblem" ng-if="::vm.isGuardian" ng-style="{ \'background-image\': \'url(http://bungie.net\' + vm.store.icon + \')\' }"></div>',
        '  <div class="class">{{:: vm.store.class || "Vault" }}</div>',
        '  <div class="race-gender" ng-if="::vm.isGuardian">{{:: vm.store.race }} {{:: vm.store.gender }}</div>',
        '  <div class="level" ng-if="::vm.isGuardian">Level {{ vm.store.level }}</div>',
        '  <div class="level powerLevel" ng-if="vm.isGuardian">{{ vm.store.powerLevel }}</div>',
        '  <div class="glimmer" ng-if="::!vm.isGuardian"> {{ vm.store.glimmer }} <img src="/images/glimmer.png"></div>',
        '  <div class="legendaryMarks" ng-if="::!vm.isGuardian"> {{ vm.store.legendaryMarks }} <img src="/images/legendaryMarks.png"></div>',
        '  <div class="levelBar" ng-if="::vm.isGuardian">',
        '    <div class="barFill" ng-style="{width: vm.store.percentToNextLevel + \'%\'}"></div>',
        '  </div>',
        '</div>',
        '<div class="loadout-popup-content">',
        '  <div class="loadout-list">',
        '    <div class="loadout-set">',
        '      <span class="button-name button-full" ng-click="vm.randomizeLoadout($event, \'all\')"><i class="fa fa-random"></i> Shuffle All</span>',
        '    </div>',
        '    <div class="loadout-set">',
        '      <span class="button-name button-full" ng-click="vm.randomizeLoadout($event, \'weapons\')"><i class="fa fa-random"></i> Shuffle Weapons</span>',
        '    </div>',
        '    <div class="loadout-set">',
        '      <span class="button-name button-full" ng-click="vm.randomizeLoadout($event, \'armor\')"><i class="fa fa-random"></i> Shuffle Armor</span>',
        '    </div>',
        '    <div class="loadout-set">',
        '      <span class="button-name button-full" ng-click="vm.randomizeLoadout($event, \'general\')"><i class="fa fa-random"></i> Shuffle General</span>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('')
    };

    function Link(scope, element) {
      var vm = scope.vm;
      var dialogResult = null;

      vm.openLoadoutPopup = function openLoadoutPopup(e) {
        e.stopPropagation();

        if (!_.isNull(dialogResult)) {
          dialogResult.close();
        } else {
          ngDialog.closeAll();

          dialogResult = ngDialog.open({
            template: '<div ng-click="$event.stopPropagation();" dim-click-anywhere-but-here="vm.closeLoadoutPopup()" dim-loadout-popup="vm.store"></div>',
            plain: true,
            appendTo: 'div[loadout-id="' + vm.store.id + '"]',
            overlay: false,
            className: 'loadout-popup',
            showClose: false,
            scope: scope
          });

          dialogResult.closePromise.then(function(data) {
            dialogResult = null;
          });
        }
      };

      vm.closeLoadoutPopup = function closeLoadoutPopup() {
        if (!_.isNull(dialogResult)) {
          dialogResult.close();
        }
      };
      element.addClass('character');
    }
  }
  
  StoreHeadingCtrl.$inject = ['$scope', '$rootScope', 'loadingTracker', 'ngDialog', 'dimItemService', 'toaster', '$q', 'dimStoreService', 'dimItemTier'];

  function StoreHeadingCtrl($scope, $rootScope, loadingTracker, ngDialog, dimItemService, toaster, $q, dimStoreService, dimItemTier) {
    var vm = this;
    vm.isGuardian = (vm.store.id !== 'vault');

    vm.classTypeId = {
      'warlock': 0,
      'titan': 1,
      'hunter': 2
    }[vm.store.class] || 0;

    vm.makeSpace = function makeSpace(types, $event) {
      console.log('Space making!');
      var stores = dimStoreService.getStores();
      var vault;
      _.each(stores, function(store) {
        if (store.id == 'vault') vault = store;
      });
      _.each(types, function(type) {
        var items = _.chain(vm.store.items)
          .filter(function(i) {
            return type === i.type && i.equipped === false;
          })
        console.log(type + ' ' + items.size().value())
        if (items.size().value() === 9) {
          console.log(type + ' full')
          var moveItem = items.value().splice(8, 1);
          dimItemService.moveTo(moveItem[0], vault);
          var postItems = _.chain(vm.store.items)
            .filter(function(i) {
              return type === i.type && i.equipped === false;
            })
          console.log(type + ' after ' + postItems.size().value());
        }
      });
    }

    vm.applyLoadout = function applyLoadout(loadout, $event) {
      ngDialog.closeAll();
      
      var scope = {
        failed: false
      };

      var items = _.chain(loadout.items)
        .values()
        .flatten()
        .value();

      var _types = _.chain(items)
        .pluck('type')
        .uniq()
        .value();

      var _items = _.chain(vm.store.items)
        .filter(function(item) {
          return _.contains(_types, item.type);
        })
        .filter(function(item) {
          return (!_.some(items, function(i) {
            return ((i.id === item.id) && (i.hash === item.hash));
          }));
        })
        .groupBy(function(item) {
          return item.type;
        })
        .value();

      applyLoadoutItems(items, loadout, _items, scope);
    };

    // Apply a randomized loadout
    vm.randomizeLoadout = function randomizeLoadout($event, type) {
      // These types contribute to light and appearance
      var lightTypes = [
        'Primary',
        'Special',
        'Heavy',
        'Helmet',
        'Gauntlets',
        'Chest',
        'Leg',
        'ClassItem',
        'Artifact',
        'Ghost'
      ]
      if (type == 'weapons') {
        lightTypes = [
          'Primary',
          'Special',
          'Heavy',
        ]
      }
      if (type == 'armor') {
        lightTypes = [
          'Helmet',
          'Gauntlets',
          'Chest',
          'Leg',
          'ClassItem',
        ]
      }
      if (type == 'general') {
        lightTypes = [
          'Artifact',
          'Ghost'
        ]
      }

      // TODO: this should be a method somewhere that gets all items equippable by a character
      var applicableItems = _.select(dimItemService.getItems(), function(i) {
        return i.equipment &&
          (i.classTypeName === 'unknown' || i.classTypeName === vm.store.class) && // for our class
          i.equipRequiredLevel <= vm.store.level && // nothing we are too low-level to equip
          _.contains(lightTypes, i.type) && // one of our selected types
          !i.notransfer; // can be moved
      });
      var itemsByType = _.groupBy(applicableItems, 'type');

      var isExotic = function(item) {
        return item.tier === dimItemTier.exotic;
      };

      // Pick random items
      var items = {};
      var exoticFound = false;
      // Shuffle order
      lightTypes = _.shuffle(lightTypes);
      _.each(lightTypes, function(type) {
        if (itemsByType.hasOwnProperty(type)) {
          items[type] = _.sample(itemsByType[type]);
          while (isExotic(items[type]) && exoticFound && itemsByType[type].length) {
            var index = itemsByType[type].indexOf(items[type]);
            itemsByType[type].splice(index, 1);
            items[type] = _.sample(itemsByType[type]);
          }
          if (isExotic(items[type])) exoticFound = true;
        }
      });

      // Copy the items and mark them "equipped" and put them in arrays, so they look like a loadout
      var finalItems = {};
      _.each(items, function(item, type) {
        var itemCopy = angular.copy(item);
        itemCopy.equipped = true;
        finalItems[type.toLowerCase()] = [ itemCopy ];
      });

      var loadout = {
        classType: -1,
        name: 'Shuffle ' + type,
        items: finalItems
      };
      
      vm.makeSpace(lightTypes, $event)
      vm.applyLoadout(loadout, $event);
    };

    function applyLoadoutItems(items, loadout, _items, scope) {
      if (items.length > 0) {
        var pseudoItem = items.splice(0, 1)[0];
        var item = dimItemService.getItem(pseudoItem);

        if (item.type === 'Class') {
          item = _.findWhere(vm.store.items, {
            hash: pseudoItem.hash
          });
        }

        if (item) {
          var size = _.chain(vm.store.items)
            .filter(function(i) {
              return item.type === i.type;
            })
            .size()
            .value();

          var p = $q.when(item);

          var target;

          if (size === 10) {
            if (item.owner !== vm.store.id) {
              var moveItem = _items[item.type].splice(0, 1);
              p = $q.when(dimStoreService.getStores())
                .then(function(stores) {
                  return _.chain(stores)
                    // .filter(function(s) {
                    //   return (s.id !== 'vault');
                    // })
                    .sortBy(function(s) {
                      if (s.id === vm.store.id) {
                        return 0;
                      } else if (s.id === 'vault') {
                        return 2;
                      } else {
                        return 1;
                      }
                    })
                    .value();
                })
                .then(function(sortedStores) {
                  return _.find(sortedStores, function(s) {
                    return _.chain(s.items)
                      .filter(function(i) {
                        return item.type === i.type;
                      })
                      .size()
                      .value() < ((s.id === 'vault') ? 72 : 10);
                  });
                })
                .then(function(t) {
                  if (_.isUndefined(t)) {
                    throw new Error('Collector eh?  All your characters ' + moveItem[0].type.toLowerCase() + ' slots are full and I can\'t move items of characters, yet... Clear a slot on a character and I can complete the loadout.');
                  }
                  target = t;

                  return dimItemService.moveTo(moveItem[0], target);
                });
            }
          }

          var promise = p
            .then(function() {
              return dimItemService.moveTo(item, vm.store, pseudoItem.equipped);
            })
            .catch(function(a) {
              scope.failed = true;
              toaster.pop('error', item.name, a.message);
            })
            .finally(function() {
              applyLoadoutItems(items, loadout, _items, scope);
            });

          loadingTracker.addPromise(promise);
        }
      } else {
        var dimStores;

        $q.when(dimStoreService.getStores())
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
            })
          })
          .then(function() {
            var value = 'success';
            var message = 'Your loadout has been transfered.';

            if (scope.failed) {
              value = 'warning';
              message = 'Your loadout has been transfered, with errors.'
            }

            toaster.pop(value, loadout.name, message);
          });
      }
    }
  }
})();
