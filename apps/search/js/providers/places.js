(function() {

  'use strict';

  // We current re sync from scratch every time and store the last 50
  // urls in memory
  var results = {};
  var icons = {};
  var urls = [];
  var MAX_URLS = 50;

  // Maximum number of results to show show for a single query
  var MAX_RESULTS = 5;

  // Name of the datastore we pick up places from
  var STORE_NAME = 'places';

  // The last revision that we synced from the datastore, we sync
  // every time the search app gains focus
  var lastRevision = 0;

  // Is there a sync in progress
  var syncing = false;

  var store;

  navigator.getDataStores(STORE_NAME).then(function(stores) {
    store = stores[0];
    store.onchange = function() {
      doSync();
    };
    doSync();
  });

  function saveIcon(url) {
    if (url in icons) {
      return;
    }
    fetchIcon(url, function(err, icon) {
      if (err) {
        // null it out so we dont keep fetching broken icons
        icons[url] = null;
      } else {
        icons[url] = icon;
      }
    });
  }

  function fetchIcon(uri, callback) {
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', function() {
      // Check icon was successfully downloded
      // 0 is due to https://bugzilla.mozilla.org/show_bug.cgi?id=716491
      if (!(xhr.status === 200 || xhr.status === 0)) {
        return callback(new Error('error_downloading'));
      }

      var blob = xhr.response;

      if (blob.type.split('/')[0] != 'image') {
        return callback(new Error('not an image'));
      }

      if (blob.size > this.MAX_ICON_SIZE) {
        return callback(new Error('image_to_large'));
      }

      // Only save the icon if it can be loaded as an image bigger than 0px
      var img = document.createElement('img');
      img.src = window.URL.createObjectURL(blob);

      img.onload = function() {
        window.URL.revokeObjectURL(img.src);
        if (!(img.naturalWidth > 0)) {
          return callback(new Error('Cannot load image'));
        }
        callback(null, blob);
      };

      img.onerror = function() {
        window.URL.revokeObjectURL(src);
        return callback(new Error('Cannot load image'));
      };
    });

    xhr.onerror = function() {
      return callback(new Error('Cannot load uri'));
    };
    xhr.send();
  }

  function doSync() {
    if (syncing) return;
    syncing = true;
    var cursor = store.sync(lastRevision);

    function cursorResolve(task) {
      lastRevision = task.revisionId;
      switch (task.operation) {
        // First implementation simply syncs recently used links
        // and searches most recent, this will eventually be used
        // to build an index
      case 'update':
      case 'add':
        if (task.data.url.startsWith('app://') ||
            task.data.url === 'about:blank') {
          break;
        }
        results[task.data.url] = task.data;
        if (task.data.iconUri) {
          saveIcon(task.data.iconUri);
        }
        if (!(task.data.url in urls)) {
          urls.unshift(task.data.url);
        }
        while (urls.length > MAX_URLS) {
          var url = urls.pop();
          delete results[url];
        }
        break;
      case 'clear':
      case 'remove':
        break;
      case 'done':
        syncing = false;
        return;
      }
      cursor.next().then(cursorResolve);
    }
    cursor.next().then(cursorResolve);
  }

  function matchesFilter(value, filter) {
    return !value || !filter || value.match(new RegExp(filter, 'i')) !== null;
  }

  function createPlaceDom(placeObj, filter) {

    //<div class="place" data-url="mozilla.com">
    //  <img class="favicon" src="..." />
    //  <div class="urlwrapper">
    //    <span class="title">My Urlasljd alskdja lsdjka sldjk</span>
    //    <small class="url">http://url.com</small>
    //  </div>
    //</div>

    var place = document.createElement('div');
    var favicon = document.createElement('img');
    var urlwrapper = document.createElement('div');
    var title = document.createElement('span');
    var url = document.createElement('small');

    place.classList.add('place');
    favicon.classList.add('favicon');
    urlwrapper.classList.add('urlwrapper');
    title.classList.add('title');
    url.classList.add('url');

    place.dataset.url = placeObj.url;

    if (placeObj.iconUri in icons && icons[placeObj.iconUri]) {
      favicon.src = window.URL.createObjectURL(icons[placeObj.iconUri]);
      favicon.onload = function() { window.URL.revokeObjectURL(favicon.src); };
    } else {
      favicon.classList.add('empty');
    }

    var titleText = placeObj.title || placeObj.url;
    title.innerHTML = HtmlHelper.createHighlightHTML(titleText, filter);
    url.innerHTML = HtmlHelper.createHighlightHTML(placeObj.url, filter);

    urlwrapper.appendChild(title);
    urlwrapper.appendChild(url);
    place.appendChild(favicon);
    place.appendChild(urlwrapper);

    return place;
  }

  function Places() {}

  Places.prototype = {

    __proto__: Provider.prototype,

    name: 'Places',

    click: function(e) {
      var target = e.target;
      Search.close();
      window.open(target.dataset.url, '_blank', 'remote=true');
    },

    search: function(filter) {
      this.clear();
      var matched = 0;
      var fragment = document.createDocumentFragment();
      for (var url in results) {
        var result = results[url];
        if (!(matchesFilter(result.title, filter) ||
              matchesFilter(result.url, filter))) {
          continue;
        }

        fragment.appendChild(createPlaceDom(result, filter));

        if (++matched > MAX_RESULTS) {
          break;
        }
      }
      this.container.appendChild(fragment.cloneNode(true));
    }
  };

  Search.provider(new Places());

}());
