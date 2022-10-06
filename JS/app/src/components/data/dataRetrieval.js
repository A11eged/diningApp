import React from 'react';

// Import of function
/*
 @param String html    The string with HTML which has be converted to a DOM object
 @param func callback  (optional) Callback(HTMLDocument doc, function destroy)
 @returns              undefined if callback exists, else: Object
                        HTMLDocument doc  DOM fetched from Parameter:html
                        function destroy  Removes HTMLDocument doc.         */
function string2dom(html, callback) {
  /* Sanitise the string */
  html = sanitiseHTML(html); /*Defined at the bottom of the answer*/

  /* Create an IFrame */
  var iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  var doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  function destroy() {
    iframe.parentNode.removeChild(iframe);
  }
  if (callback) callback(doc, destroy);
  else return { doc: doc, destroy: destroy };
}

/* @name sanitiseHTML
   @param String html  A string representing HTML code
   @return String      A new string, fully stripped of external resources.
                       All "external" attributes (href, src) are prefixed by data- */

function sanitiseHTML(html) {
  /* Adds a <!-\"'--> before every matched tag, so that unterminated quotes
        aren't preventing the browser from splitting a tag. Test case:
       '<input style="foo;b:url(0);><input onclick="<input type=button onclick="too() href=;>">' */
  var prefix = '<!--"\'-->';
  /*Attributes should not be prefixed by these characters. This list is not
     complete, but will be sufficient for this function.
      (see http://www.w3.org/TR/REC-xml/#NT-NameChar) */
  var att = '[^-a-z0-9:._]';
  var tag = '<[a-z]';
  var any = '(?:[^<>"\']*(?:"[^"]*"|\'[^\']*\'))*?[^<>]*';
  var etag = '(?:>|(?=<))';

  /*
      @name ae
      @description          Converts a given string in a sequence of the
                             original input and the HTML entity
      @param String string  String to convert
      */
  var entityEnd = '(?:;|(?!\\d))';
  var ents = {
    ' ': '(?:\\s|&nbsp;?|&#0*32' + entityEnd + '|&#x0*20' + entityEnd + ')',
    '(': '(?:\\(|&#0*40' + entityEnd + '|&#x0*28' + entityEnd + ')',
    ')': '(?:\\)|&#0*41' + entityEnd + '|&#x0*29' + entityEnd + ')',
    '.': '(?:\\.|&#0*46' + entityEnd + '|&#x0*2e' + entityEnd + ')',
  };
  /*Placeholder to avoid tricky filter-circumventing methods*/
  var charMap = {};
  var s = ents[' '] + '*'; /* Short-hand space */
  /* Important: Must be pre- and postfixed by < and >. RE matches a whole tag! */
  function ae(string) {
    var all_chars_lowercase = string.toLowerCase();
    if (ents[string]) return ents[string];
    var all_chars_uppercase = string.toUpperCase();
    var RE_res = '';
    for (var i = 0; i < string.length; i++) {
      var char_lowercase = all_chars_lowercase.charAt(i);
      if (charMap[char_lowercase]) {
        RE_res += charMap[char_lowercase];
        continue;
      }
      var char_uppercase = all_chars_uppercase.charAt(i);
      var RE_sub = [char_lowercase];
      RE_sub.push('&#0*' + char_lowercase.charCodeAt(0) + entityEnd);
      RE_sub.push(
        '&#x0*' + char_lowercase.charCodeAt(0).toString(16) + entityEnd
      );
      if (char_lowercase != char_uppercase) {
        RE_sub.push('&#0*' + char_uppercase.charCodeAt(0) + entityEnd);
        RE_sub.push(
          '&#x0*' + char_uppercase.charCodeAt(0).toString(16) + entityEnd
        );
      }
      RE_sub = '(?:' + RE_sub.join('|') + ')';
      RE_res += charMap[char_lowercase] = RE_sub;
    }
    return (ents[string] = RE_res);
  }
  /*
      @name by
      @description  second argument for the replace function.
      */
  function by(match, group1, group2) {
    /* Adds a data-prefix before every external pointer */
    return group1 + 'data-' + group2;
  }
  /*
      @name cr
      @description            Selects a HTML element and performs a
                                  search-and-replace on attributes
      @param String selector  HTML substring to match
      @param String attribute RegExp-escaped; HTML element attribute to match
      @param String marker    Optional RegExp-escaped; marks the prefix
      @param String delimiter Optional RegExp escaped; non-quote delimiters
      @param String end       Optional RegExp-escaped; forces the match to
                                  end before an occurence of <end> when 
                                  quotes are missing
     */
  function cr(selector, attribute, marker, delimiter, end) {
    if (typeof selector == 'string') selector = new RegExp(selector, 'gi');
    marker = typeof marker == 'string' ? marker : '\\s*=';
    delimiter = typeof delimiter == 'string' ? delimiter : '';
    end = typeof end == 'string' ? end : '';
    var is_end = end && '?';
    var re1 = new RegExp(
      '(' +
        att +
        ')(' +
        attribute +
        marker +
        '(?:\\s*"[^"' +
        delimiter +
        "]*\"|\\s*'[^'" +
        delimiter +
        "]*'|[^\\s" +
        delimiter +
        ']+' +
        is_end +
        ')' +
        end +
        ')',
      'gi'
    );
    html = html.replace(selector, function (match) {
      return prefix + match.replace(re1, by);
    });
  }
  /* 
      @name cri
      @description            Selects an attribute of a HTML element, and
                               performs a search-and-replace on certain values
      @param String selector  HTML element to match
      @param String attribute RegExp-escaped; HTML element attribute to match
      @param String front     RegExp-escaped; attribute value, prefix to match
      @param String flags     Optional RegExp flags, default "gi"
      @param String delimiter Optional RegExp-escaped; non-quote delimiters
      @param String end       Optional RegExp-escaped; forces the match to
                                  end before an occurence of <end> when 
                                  quotes are missing
     */
  function cri(selector, attribute, front, flags, delimiter, end) {
    if (typeof selector == 'string') selector = new RegExp(selector, 'gi');
    flags = typeof flags == 'string' ? flags : 'gi';
    var re1 = new RegExp(
      '(' + att + attribute + '\\s*=)((?:\\s*"[^"]*"|\\s*\'[^\']*\'|[^\\s>]+))',
      'gi'
    );

    end = typeof end == 'string' ? end + ')' : ')';
    var at1 = new RegExp('(")(' + front + '[^"]+")', flags);
    var at2 = new RegExp("(')(" + front + "[^']+')", flags);
    var at3 = new RegExp(
      '()(' +
        front +
        '(?:"[^"]+"|\'[^\']+\'|(?:(?!' +
        delimiter +
        ').)+)' +
        end,
      flags
    );

    var handleAttr = function (match, g1, g2) {
      if (g2.charAt(0) == '"') return g1 + g2.replace(at1, by);
      if (g2.charAt(0) == "'") return g1 + g2.replace(at2, by);
      return g1 + g2.replace(at3, by);
    };
    html = html.replace(selector, function (match) {
      return prefix + match.replace(re1, handleAttr);
    });
  }

  /* <meta http-equiv=refresh content="  ; url= " > */
  html = html.replace(
    new RegExp(
      '<meta' +
        any +
        att +
        'http-equiv\\s*=\\s*(?:"' +
        ae('refresh') +
        '"' +
        any +
        etag +
        "|'" +
        ae('refresh') +
        "'" +
        any +
        etag +
        '|' +
        ae('refresh') +
        '(?:' +
        ae(' ') +
        any +
        etag +
        '|' +
        etag +
        '))',
      'gi'
    ),
    '<!-- meta http-equiv=refresh stripped-->'
  );

  /* Stripping all scripts */
  html = html.replace(
    new RegExp(
      '<script' +
        any +
        '>\\s*//\\s*<\\[CDATA\\[[\\S\\s]*?]]>\\s*</script[^>]*>',
      'gi'
    ),
    '<!--CDATA script-->'
  );
  html = html.replace(
    /<script[\S\s]+?<\/script\s*>/gi,
    '<!--Non-CDATA script-->'
  );
  cr(
    tag + any + att + 'on[-a-z0-9:_.]+=' + any + etag,
    'on[-a-z0-9:_.]+'
  ); /* Event listeners */

  cr(tag + any + att + 'href\\s*=' + any + etag, 'href'); /* Linked elements */
  cr(tag + any + att + 'src\\s*=' + any + etag, 'src'); /* Embedded elements */

  cr(
    '<object' + any + att + 'data\\s*=' + any + etag,
    'data'
  ); /* <object data= > */
  cr(
    '<applet' + any + att + 'codebase\\s*=' + any + etag,
    'codebase'
  ); /* <applet codebase= > */

  /* <param name=movie value= >*/
  cr(
    '<param' +
      any +
      att +
      'name\\s*=\\s*(?:"' +
      ae('movie') +
      '"' +
      any +
      etag +
      "|'" +
      ae('movie') +
      "'" +
      any +
      etag +
      '|' +
      ae('movie') +
      '(?:' +
      ae(' ') +
      any +
      etag +
      '|' +
      etag +
      '))',
    'value'
  );

  /* <style> and < style=  > url()*/
  cr(
    /<style[^>]*>(?:[^"']*(?:"[^"]*"|'[^']*'))*?[^'"]*(?:<\/style|$)/gi,
    'url',
    '\\s*\\(\\s*',
    '',
    '\\s*\\)'
  );
  cri(
    tag + any + att + 'style\\s*=' + any + etag,
    'style',
    ae('url') + s + ae('(') + s,
    0,
    s + ae(')'),
    ae(')')
  );

  /* IE7- CSS expression() */
  cr(
    /<style[^>]*>(?:[^"']*(?:"[^"]*"|'[^']*'))*?[^'"]*(?:<\/style|$)/gi,
    'expression',
    '\\s*\\(\\s*',
    '',
    '\\s*\\)'
  );
  cri(
    tag + any + att + 'style\\s*=' + any + etag,
    'style',
    ae('expression') + s + ae('(') + s,
    0,
    s + ae(')'),
    ae(')')
  );
  return html.replace(new RegExp('(?:' + prefix + ')+', 'g'), prefix);
}

function parse_response(response) {
  if (response === '') {
    return [];
  } else {
    let split_list = response.split(',');
    let i = 0;
    const ingredient_list = [];
    while (i < split_list.length) {
      let ingredient = [];
      if (split_list[i].includes('(')) {
        ingredient += split_list[i];
        if (split_list[i].includes(')')) {
          break;
        } else {
          ingredient += ', ';
        }
        i += 1;
      } else {
        ingredient = split_list[i];
      }
      ingredient.trim();
      ingredient_list.push(ingredient);
      i += 1;
      console.log(ingredient_list);
      return ingredient_list;
    }
  }
}

function todict(data) {
  const fragment = new DocumentFragment();
  let dict = {};
  for (let i = 0; i < data.length; i++) {
    dict[data[i]] = [];
  }
  return dict;
}

const DataRetrieval = () => {
  var today = new Date();
  var day = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();
  // https://umassdining.com/foodpro-menu-ajax?tid=2&date=09%2F29%2F2022
  const request_url = 'https://umassdining.com/foodpro-menu-ajax?';
  // DC Location
  const tid = '2';
  const request_params =
    'tid=' + tid + '&date=' + mm + '%2F' + day + '%2F' + yyyy;
  // const other_params = {
  //   method: 'GET',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Accept: 'application/json',
  //   },
  //   mode: 'no-cors',
  //   cache: 'no-cache',
  //   credentials: 'same-origin',
  //   redirect: 'follow',
  // };

  // data.breakfast/lunch/dinner
  const breakfast = [
    'Breakfast Entrees',
    'Breakfast Pastries',
    'GF Hot Breakfast',
  ];
  const lunch = [
    'Desserts',
    'Deli Bar',
    'Entrees',
    'Express',
    'Grill Station',
    'Soups',
    'Gluten Free',
    'Latino FRK HMP',
    'Lunch/Dinner Miscellaneous',
    'Pasta Bar',
    'Starches',
    'Sushi',
    'Vegetables',
    'Vegetarian Line',
    'Pizza',
  ];
  const grabngo = [`Grab n'Go Cold`, `Grab n'Go Hot`];
  const dinner = [
    'Desserts',
    'Entrees',
    'Pizza',
    'Express',
    'Grill Station',
    'Soups',
    'Gluten Free',
    'Latino FRK HMP',
    'Lunch/Dinner Miscellaneous',
    'Pasta Bar',
    'Starches',
    'Sushi',
    'Vegetables',
    'Vegetarian Line',
  ];
  // , latenight, grabngo
  const times = [breakfast, lunch, dinner, grabngo];
  const literal_times = ['breakfast', 'lunch', 'dinner', 'grabngo'];
  console.log(times[1].length);
  console.log(request_url + request_params);
  // Crafting Backend Request
  const response = fetch(request_url + request_params)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      // console.log(typeof data.breakfast);
      // console.log(data.breakfast);
      // // string
      // console.log(typeof data.breakfast[breakfastOfferings[0]]);
      // // break up string
      // string2dom(
      //   '<html><head><title>Test</title></head></html>',
      //   function (doc, destroy) {
      //     alert(doc.title); /* Alert: "Test" */
      //     destroy();
      //   }
      // );

      // var test = string2dom("<div id='secret'></div>");
      // alert(test.doc.getElementById('secret').tagName); /* Alert: "DIV" */
      // test.destroy();
      // console.log(string);

      const string = data.dinner[dinner[2]];
      var contents = string2dom(string);
      // var doc = contents.doc;
      for (let i = 0; i < times.length; i++) {
        for (let j = 0; j < times[i].length; j++) {
          // console.log(i);
          // console.log(j);
          var time_food = literal_times[i];
          var time_food_station = times[i][j];
          var to_parse = 'data.' + time_food + '.' + time_food_station;
          var contents = string2dom(to_parse);
          var doc = contents.doc;
          console.log(doc);
          const menu_item_properties = doc.getElementsByTagName('a');
          console.log(menu_item_properties);
          for (let k = 0; k < menu_item_properties.length; k++) {
            var menu_item = {
              item_name: menu_item_properties[k].dataset.dishName,
              ingredients: menu_item_properties[k].dataset.ingredientList,
              healthfulness: menu_item_properties[k].dataset.healthfulness,
              carbon_footprint: menu_item_properties[k].dataset.carbonList,
              allergens: menu_item_properties[k].dataset.allergens,
              clean_diet: menu_item_properties[k].dataset.cleanDietStr,
              serving_size: menu_item_properties[k].dataset.servingSize,
              calories: menu_item_properties[k].dataset.calories,
              calories_from_fat:
                menu_item_properties[k].dataset.caloriesFromFat,
              total_fat: menu_item_properties[k].dataset.totalFat,
              total_fat_dv: menu_item_properties[k].dataset.totalFatDv,
              sat_fat: menu_item_properties[k].dataset.satFat,
              sat_fat_dv: menu_item_properties[k].dataset.satFatDv,
              trans_fat: menu_item_properties[k].dataset.transFat,
              cholesterol: menu_item_properties[k].dataset.cholesterol,
              cholesterol_dv: menu_item_properties[k].dataset.cholesterol_dv,
              sodium: menu_item_properties[k].dataset.sodium,
              sodium_dv: menu_item_properties[k].dataset.sodiumDv,
              total_carbs: menu_item_properties[k].dataset.totalCarb,
              total_carbs_dv: menu_item_properties[k].dataset.totalCarbDv,
              dietary_fiber: menu_item_properties[k].dataset.dietaryFiber,
              dietary_fiber_dv: menu_item_properties[k].dataset.dietaryFiberDv,
              sugars: menu_item_properties[k].dataset.sugars,
              sugars_dv: menu_item_properties[k].dataset.sugarsDv,
              protein: menu_item_properties[k].dataset.protein,
              protein_dv: menu_item_properties[k].dataset.proteinDv,
            };
            console.log('1' + menu_item);
          }
        }
      }
      // const menu_category_name =
      //   doc.getElementsByClassName('menu_category_name')[0].textContent;
      // const menu_item_properties = doc.getElementsByTagName('a');
      // // food item name
      // var menu_item = {
      //   item_name: menu_item_properties[0].dataset.dishName,
      //   ingredients: menu_item_properties[0].dataset.ingredientList,
      //   healthfulness: menu_item_properties[0].dataset.healthfulness,
      //   carbon_footprint: menu_item_properties[0].dataset.carbonList,
      //   allergens: menu_item_properties[0].dataset.allergens,
      //   clean_diet: menu_item_properties[0].dataset.cleanDietStr,
      //   serving_size: menu_item_properties[0].dataset.servingSize,
      //   calories: menu_item_properties[0].dataset.calories,
      //   calories_from_fat: menu_item_properties[0].dataset.caloriesFromFat,
      //   total_fat: menu_item_properties[0].dataset.totalFat,
      //   total_fat_dv: menu_item_properties[0].dataset.totalFatDv,
      //   sat_fat: menu_item_properties[0].dataset.satFat,
      //   sat_fat_dv: menu_item_properties[0].dataset.satFatDv,
      //   trans_fat: menu_item_properties[0].dataset.transFat,
      //   cholesterol: menu_item_properties[0].dataset.cholesterol,
      //   cholesterol_dv: menu_item_properties[0].dataset.cholesterol_dv,
      //   sodium: menu_item_properties[0].dataset.sodium,
      //   sodium_dv: menu_item_properties[0].dataset.sodiumDv,
      //   total_carbs: menu_item_properties[0].dataset.totalCarb,
      //   total_carbs_dv: menu_item_properties[0].dataset.totalCarbDv,
      //   dietary_fiber: menu_item_properties[0].dataset.dietaryFiber,
      //   dietary_fiber_dv: menu_item_properties[0].dataset.dietaryFiberDv,
      //   sugars: menu_item_properties[0].dataset.sugars,
      //   sugars_dv: menu_item_properties[0].dataset.sugarsDv,
      //   protein: menu_item_properties[0].dataset.protein,
      //   protein_dv: menu_item_properties[0].dataset.proteinDv,
      // };
      // console.log(menu_item);
    });
  console.log(response);
  return <div></div>;
};

export default DataRetrieval;
