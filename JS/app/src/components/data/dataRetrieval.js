import React from 'react';

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
  // https://umassdining.com/foodpro-menu-ajax?tid=2&date=09%2F29%2F2022
  const request_url = 'https://umassdining.com/foodpro-menu-ajax?';
  const request_params = 'tid=2&date=09%2F29%2F2022';
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
  const times = ['breakfast', 'lunch', 'dinner', 'latenight', 'grabngo'];

  const breakfastOfferings = [
    'Breakfast Entrees',
    'Breakfast Pastries',
    'GF Hot Breakfast',
  ];
  const response = fetch(request_url + request_params)
    .then((response) => response.json())
    .then((data) => {
      console.log(typeof data.breakfast);
      console.log(data.breakfast);
      // string
      console.log(typeof data.breakfast[breakfastOfferings[0]]);
      // break up string
      const string = data.breakfast[breakfastOfferings[0]];
      console.log(parse_response(string));
    });
  return <div></div>;
};

export default DataRetrieval;
