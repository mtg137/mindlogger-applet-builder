import util from '../utilities/util';
export default class Item {
  constructor() {
    this.ref = null;
  }

  static getQuesionInfo(question) {
    const imageRE = new RegExp(/[\r\n]*\!\[.*\]\(.*=.*\)[\r\n]*/i);
    const imageUrlRE = new RegExp(/\h([^ =]+)/i);
    const imageMatch = question.match(imageUrlRE);

    const questionImage = imageMatch && imageMatch[0] || '';  // The image URL.
    const questionText = question.replace(imageRE, '');  // Remove the image from the question.

    return {
      image: questionImage,
      text: questionText
    }
  }

  getItemBuilderData(initialItemData) {
    const question = Item.getQuesionInfo(initialItemData.question || '');
    let inputType = initialItemData.ui ? initialItemData.ui.inputType : '';

    if (inputType == 'radio' && initialItemData.options.isMultipleChoice) {
      inputType = 'checkbox';
    }

    return {
      id: initialItemData._id || null,
      name: initialItemData.name || '',
      question,
      description: initialItemData.description || '',
      correctAnswer: initialItemData.correctAnswer || '',
      valueType: initialItemData.valueType || '',
      inputType,
      options: initialItemData.options || {},
      allow: initialItemData.ui && initialItemData.ui.allow
        && (initialItemData.ui.allow.includes("dontKnow")
          || initialItemData.ui.allow.includes("dont_know_answer")),
      responseOptions: initialItemData.responseOptions || {},
      inputOptions: initialItemData.inputOptions || [],
      media: initialItemData.media || {},
      cumulativeScores: initialItemData.cumulativeScores  || [],
      allowEdit: initialItemData.allowEdit === undefined ? true : initialItemData.allowEdit,
      markdownText: (initialItemData.question || ''),
    };
  }

  updateReferenceObject(ref) {
    this.ref = ref;
  }

  getSliderChoices() {
    const choices = [];
    for (let i = 1; i <= this.ref.options.numOptions; i++) {
      let obj = {
        "schema:name": i.toString(),
        "schema:value": i
      };

      if (this.ref.options.hasScoreValue) {
        obj["schema:score"] = this.ref.options.scores[i-1];
      }

      if (this.ref.options.minValueImg && i === 1)
        obj["schema:image"] = this.ref.options.minValueImg;
      
      if(this.ref.options.maxValueImg && i === this.ref.options.numOptions)
        obj["schema:image"] = this.ref.options.maxValueImg;

      choices.push(obj);
    }
    
    return choices;
  }

  getRadioChoices() {
    const choices =
        this.ref.options && this.ref.options.options
        ? this.ref.options.options.map((option, index) => {
            const choiceSchema = {
                "@type": "schema:option",
                "schema:name": option.name,
                "schema:value": option.value,
                "schema:description": option.description,
            };

            if(this.ref.inputType === "prize")
              choiceSchema["schema:price"] = option.price;

            if (this.ref.options.hasScoreValue) {
              choiceSchema["schema:score"] = (option.score || 0);
            }

            if (option.image) {
                choiceSchema["schema:image"] = option.image;
            }
            return choiceSchema;
            })
        : [];
    return choices;
  }

  getResponseOptions() {
    if (this.ref.inputType === "radio" || this.ref.inputType === "prize" || this.ref.inputType === "checkbox") {
      const choices = this.getRadioChoices();
      return {
        "valueType": (this.ref.valueType.includes("token") || this.ref.options.isTokenValue) ? "xsd:token" : "xsd:anyURI",
        "scoring": this.ref.options.hasScoreValue,
        "responseAlert": this.ref.options.hasResponseAlert,
        "multipleChoice": this.ref.options.isMultipleChoice,
        "responseAlertMessage": this.ref.options.responseAlertMessage,
        "schema:minValue": 1,
        "schema:maxValue": choices.length,
        choices: choices
      };
    }
    if (this.ref.inputType === "text") {
      return {
        'valueType': this.ref.options.valueType || this.ref.valueType,
        'requiredValue': this.ref.options.requiredValue,
      }
    }
    if (this.ref.inputType === "slider") {
      const choices = this.getSliderChoices();
      return {
        "valueType": "xsd:integer",
        "scoring": this.ref.options.hasScoreValue,
        "responseAlert": this.ref.options.hasResponseAlert,
        "responseAlertMessage": this.ref.options.responseAlertMessage,
        "schema:minValue": this.ref.options.minValue,
        "schema:maxValue": this.ref.options.maxValue,
        "schema:minValueImg": this.ref.options.minValueImg,
        "schema:maxValueImg": this.ref.options.maxValueImg,
        choices: choices
      };
    }
    if (this.ref.inputType === "date") {
      return {
        valueType: "xsd:date",
        requiredValue: true,
        "schema:maxValue": "new Date()"
      };
    }
    if (this.ref.inputType === "audioImageRecord" || this.ref.inputType === "drawing" || this.ref.inputType === "geolocation") {
      return this.ref.responseOptions;
    }
    if (this.ref.inputType === "audioRecord") {
        return this.ref.options;
    } else {
        return {};
    }
  }

  getCumulativeScores() {
    if (this.ref.inputType === 'cumulativeScore') {
      return this.ref.cumulativeScores.map(({ compute, messages }) => ({ compute, messages }));
    }
    return [];
  }

  getCompressedSchema() {
    const responseOptions = this.getResponseOptions();
    const cumulativeScores = this.getCumulativeScores();

    const schema = {
        "@context": [
          "https://raw.githubusercontent.com/jj105/reproschema-context/master/context.json"
        ],
        "@type": "reproschema:Field",
        "@id": this.ref.name,
        "skos:prefLabel": this.ref.name,
        "skos:altLabel": this.ref.name,
        "schema:description": this.ref.description,
        "schema:schemaVersion": "0.0.1",
        "schema:version": "0.0.1",
        ui: {
          inputType: this.ref.inputType,
        },
    };
    if (Object.keys(responseOptions).length !== 0) {
      schema["responseOptions"] = responseOptions;
    }

    if (this.ref.inputType === 'cumulativeScore') {
      schema['cumulativeScores'] = cumulativeScores;
    }

    if (this.ref.inputType === 'radio' || this.ref.inputType === 'checkbox' || this.ref.inputType === 'prize') {
      const inputType = (this.ref.inputType === 'radio' || this.ref.inputType === 'checkbox') ? 'radio' : 'prize';

      if (this.ref.options.isMultipleChoice) {
        schema["ui"] = {
          inputType
        };
      } else {
        schema["ui"] = {
          inputType,
          allow: [
            "autoAdvance"
          ]
        };
      }
    } else {
      schema["ui"] = {
        inputType: this.ref.inputType
      };

      if (this.ref.inputType === "cumulativeScore") {
        schema["ui"]["allow"] = schema["ui"]["allow"] || [];
        schema["ui"]["allow"].push("disableBack");
      }
    }

    if (this.ref.id) {
        schema["_id"] = this.ref.id;
    }

    if (this.ref.allow) {
      if (!schema["ui"]["allow"]) {
        schema["ui"]["allow"] = []
      }
      schema["ui"]["allow"].push("dontKnow")
    }

    return schema;
  }

  getItemData() {
    const schema = this.getCompressedSchema();
    const itemObj = {
      name: this.ref.name,
      question: 
        this.ref.inputType !== 'markdownMessage'
        ? this.ref.question.image ? `\r\n\r\n![''](${this.ref.question.image} =250x250)\r\n\r\n${this.ref.question.text}` : this.ref.question.text
        : this.ref.markdownText,
      description: this.ref.description,
      options: this.ref.options,
      allowEdit: this.ref.allowEdit,
      ...schema
    };

    if (
      (this.ref.inputType === "radio" ||
        this.ref.inputType === "checkbox" ||
        this.ref.inputType === "prize" ||
        this.ref.inputType === "audioRecord") &&
      Object.keys(this.ref.responseOptions).length
    ) {
      itemObj.responseOptions = itemObj.responseOptions || this.ref.responseOptions;
    }

    else if(this.ref.inputType === "drawing") {
      itemObj.inputOptions = this.ref.inputOptions;
    }

    else if(this.ref.inputType === "audioImageRecord") {
      if(!itemObj.responseOptions['schema:image']) {
        // default image
        itemObj.responseOptions['schema:image'] = 'https://www.dropbox.com/s/wgtjq3bgqlfhbzd/map3g.png?raw=1';
      }
    }

    else if (this.ref.inputType === "audioStimulus") {
      itemObj.inputOptions = this.ref.inputOptions;
      itemObj.media = this.ref.media;
    }
    else if (this.ref.inputType === "text") {
      itemObj.responseOptions = itemObj.responseOptions || this.ref.responseOptions;
      itemObj.correctAnswer = this.ref.correctAnswer;
    } else if (this.ref.inputType === "slider") {
      itemObj.options.minValue = itemObj.options.minValue || "Min";
      itemObj.options.minValueImg = itemObj.options.minValueImg || "";
      itemObj.options.maxValue = itemObj.options.maxValue || "Max";
      itemObj.options.maxValueImg = itemObj.options.maxValueImg || "";
      itemObj.options.numOptions = itemObj.options.numOptions || 5;
      itemObj.options.hasScoreValue = itemObj.options.hasScoreValue || false;
      itemObj.options.hasResponseAlert = itemObj.options.hasResponseAlert || false;
    }

    return itemObj;
  }

  static getHistoryTemplate(oldValue, newValue) {
    const radioOptionListUpdate = (field) => {
      const oldOptions = _.get(oldValue, field, []).map(({ name, value, score }) => {
        return {
          name,
          value,
          score
        }
      });
      const newOptions = _.get(newValue, field, []).map(({ name, value, score }) => {
        return {
          name,
          value,
          score
        }
      });

      const removedOptions = oldOptions.filter(option => {
        return newOptions.find(newOption => {
          return option.name === newOption.name && option.value === newOption.value && option.score === newOption.score
        }) ? false : true
      });
      const insertedOptions = newOptions.filter(newOption => {
        return oldOptions.find(option => {
          return option.name === newOption.name && option.value === newOption.value && option.score === newOption.score
        }) ? false : true
      });

      return [
        ...removedOptions.map(option => `${option.name} | ${option.value} option was removed`),
        ...insertedOptions.map(option => `${option.name} | ${option.value} option was inserted`)
      ];
    };

    const scoreUpdate = (field) => {
      const oldScore = _.get(oldValue, field, []);
      const newScore = _.get(newValue, field, []);

      const updates = [];

      let i;
      for ( i = 0; i < oldScore.length && newScore.length; i++) {
        if (oldScore[i] != newScore[i]) {
          updates.push(`score for ${i+1} is updated to ${newScore[i]}`);
        }
      }

      for ( ;i < oldScore.length || i< newScore.length; i++) {
        if (i < oldScore.length) {
          updates.push(`score for ${i+1} was removed`);
        }
        if (i < newScore.length) {
          updates.push(`score for ${i+1} was set to ${newScore[i]}`);
        }
      }

      return updates;
    }

    const allowListUpdate = (field) => {
      const oldAllowList = _.get(oldValue, field, []);
      const newAllowList = _.get(newValue, field, []);

      const updates = [];

      oldAllowList.forEach(oldAllow => {
        if (newAllowList.indexOf(oldAllow) < 0) {
          updates.push(
            `${oldAllow == 'dontKnow' ? 'Skippable Option' : oldAllow} was disabled`
          )
        }
      });

      newAllowList.forEach(newAllow => {
        if (oldAllowList.indexOf(newAllow) < 0) {
          updates.push(
            `${newAllow == 'dontKnow' ? 'Skippable Option' : newAllow} was enabled`
          )
        }
      });

      return updates;
    }

    const optionUpdate = name => field => 
          `${name} was ${_.get(newValue, field) ? 'enabled' : 'disabled'}`;
    const valueUpdate = name => field =>
          `${name} was updated to ${_.get(newValue, field)}`

    const valueInsert = name => field =>
          `${name} was set to ${_.get(newValue, field)}`;

    const inputOptionsListUpdate = (field) => {

      const oldOptions = _.get(oldValue, field, []).map(option => {
        return { value: option['schema:value'] }
      });

      const newOptions = _.get(newValue, field, []).map(option => {
        return { value: option['schema:value'] }
      });

      const removedOptions = oldOptions.filter(option => {
        return newOptions.find(newOption => {
          return option.value === newOption.value
        }) ? false : true
      });

      const insertedOptions = newOptions.filter(newOption => {
        return oldOptions.find(option => {
          return option.value === newOption.value
        }) ? false : true
      });

      return [
        ...removedOptions.map(option => `${option.value} option was removed`),
        ...insertedOptions.map(option => `${option.value} option was inserted`)
      ];
    };

    return {
      'skos:prefLabel': {
        updated: valueUpdate('Item name'),
        inserted: valueInsert('Item name')
      },
      'schema:description': {
        updated: (field) => `Item description was changed to ${_.get(newValue, field)}`,
        removed: (field) => `Item description was removed`,
        inserted: (field) => `Item description was set (${_.get(newValue, field)})`
      }, 
      'question': {
        updated: (field) => 
          _.get(newValue, 'ui.inputType') !== 'markdownMessage'
            ? `Item Question was changed to ${this.getQuesionInfo(_.get(newValue, field)).text}`
            : `Markdown message was updated`,
        removed: (field) => `Item Question was removed`,
        inserted: (field) => 
          _.get(newValue, 'ui.inputType') !== 'markdownMessage'
            ? `Item Question was set to ${this.getQuesionInfo(_.get(newValue, field)).text}`
            : `Markdown message was inserted`,
      },
      'correctAnswer': {
        updated: (field) => `Correct answer was changed`
      }, 
      'ui.inputType': {
        updated: valueUpdate('Input type'),
        inserted: valueInsert('Input type'),
      },
      'ui.allow': {
        updated: allowListUpdate,
      },    
      'options.isMultipleChoice': {
        updated: optionUpdate('Multiple choice option'),
      },
      'options.options': {
        updated: radioOptionListUpdate,
      },
      'options.schema:minValue': {
        updated: valueUpdate('minValue'),
        inserted: valueInsert('minValue'),
      },
      'options.schema:maxValue': {
        updated: valueUpdate('maxValue'),
        inserted: valueInsert('maxValue'),
      },
      'options.minValue': {
        updated: valueUpdate('minValue'),
        inserted: valueInsert('minValue'),
      },
      'options.maxValue': {
        updated: valueUpdate('maxValue'),
        inserted: valueInsert('maxValue'),
      },
      'options.minValueImg': {
        updated: valueUpdate('minValueImg'),
        inserted: valueInsert('minValueImg'),
      },
      'options.maxValueImg': {
        updated: valueUpdate('maxValueImg'),
        inserted: valueInsert('maxValueImg'),
      },
      'options.requiredValue': {
        updated: optionUpdate('Required option'),
      },
      'options.numOptions': {
        updated: valueUpdate('Scale value'),
        inserted: valueInsert('Scale value'),
      },
      'options.hasScoreValue': {
        updated: optionUpdate('Scoring option'),
      },
      'options.hasResponseAlert': {
        updated: optionUpdate('Response Alert'),
      },
      'options.responseAlertMessage': {
        updated: valueUpdate('Alert Message'),
      },
      'options.scores': {
        updated: scoreUpdate,
      },
      'options.maxLength': {
        updated: valueUpdate('maxLength'),
        inserted: valueInsert('maxLength'),
      },
      'responseOptions.requiredValue': {
        updated: optionUpdate('Required option'),
      },
      'responseOptions.schema:minValue': {
        updated: valueUpdate('minValue'),
        inserted: valueInsert('minValue'),
      },
      'responseOptions.schema:maxValue': {
        updated: valueUpdate('maxValue'),
        inserted: valueInsert('maxValue'),
      },
      'responseOptions.schema:image': {
        updated: valueUpdate('Image'),
        inserted: valueInsert('Image'),
      },
      'inputOptions': {
        updated: inputOptionsListUpdate
      }
    }
  }

  static getChangeInfo(old, current) {
    const logTemplates = Item.getHistoryTemplate(old, current);
    const changeInfo = util.compareValues(old, current, Object.keys(logTemplates));

    const changeLog = [];

    Object.keys(changeInfo).forEach(key => {
      const changeType = changeInfo[key];
      let logs = [];

      if (logTemplates[key][changeType]) {
        logs = logTemplates[key][changeType](key);
      } else {
        logs = logTemplates[key]['updated'](key);
      }
      
      if (!Array.isArray(logs)) {
        logs = [logs];
      }

      logs.forEach(log => {
        changeLog.push({
          name: log,
          type: changeInfo[key]
        })
      })
    });

    return {
      log: changeLog,
      upgrade: changeLog.length ? '0.0.1' : '0.0.0',
    };
  }

  static parseJSONLD(item) {
    let allow = []
    if (item['reprolib:terms/allow'] &&
        item['reprolib:terms/allow'][0] &&
        item['reprolib:terms/allow'][0]['@list']) {
      allow = item['reprolib:terms/allow'][0]['@list'].map(item => {
        return item['@id'].substr(15)
      })
    }

    let itemContent = {
      _id: item['_id'] && item['_id'].split('/')[1],
      name: item['@id'],
      question:
        item['schema:question'] &&
        item['schema:question'][0] &&
        item['schema:question'][0]['@value'],
      description:
        item['schema:description'] &&
        item['schema:description'][0] &&
        item['schema:description'][0]['@value'],
      ui: {
        allow,
        inputType:
          item['reprolib:terms/inputType'] &&
          item['reprolib:terms/inputType'][0] &&
          item['reprolib:terms/inputType'][0]['@value'],
      },
      allowEdit:
        item['reprolib:terms/allowEdit'] &&
        item['reprolib:terms/allowEdit'][0] ?
        item['reprolib:terms/allowEdit'][0]['@value'] : true
    };

    let responseOptions = item['reprolib:terms/responseOptions'];

    let itemType = itemContent.ui.inputType;

    if (responseOptions) {
      let multipleChoice =
        responseOptions[0] &&
        responseOptions[0]['reprolib:terms/multipleChoice'];
      let valueType = 
        responseOptions[0] &&
        responseOptions[0]['reprolib:terms/valueType']

      let scoring = 
        responseOptions[0] &&
        responseOptions[0]['reprolib:terms/scoring'];

      let responseAlert =
        responseOptions[0] &&
        responseOptions[0]['reprolib:terms/responseAlert'];

      let responseAlertMessage = 
        responseOptions[0] && 
        responseOptions[0]['reprolib:terms/responseAlertMessage'];

      if (multipleChoice) {
        itemContent.multipleChoice =
          multipleChoice[0] && multipleChoice[0]['@value'];
      }

      if (scoring) {
        itemContent.scoring = 
          scoring[0] && scoring[0]['@value'];
      }

      if (responseAlert) {
        itemContent.responseAlert = 
          responseAlert[0] && responseAlert[0]['@value'];
      }

      if (responseAlertMessage) {
        itemContent.responseAlertMessage = 
          responseAlertMessage[0] && responseAlertMessage[0]['@value'];
      }

      if (valueType) {
        itemContent.valueType =
          valueType[0] && valueType[0]['@id'];
      }

      if (itemType === 'radio') {
        itemContent.options = {
          isMultipleChoice: itemContent.multipleChoice || false,
          hasScoreValue: itemContent.scoring || false,
          hasResponseAlert: itemContent.responseAlert || false,
          responseAlertMessage: itemContent.responseAlertMessage || '',
          nextOptionImage: '',
          nextOptionName: '',
          options:
            responseOptions[0] &&
            responseOptions[0]['schema:itemListElement'] &&
            responseOptions[0]['schema:itemListElement'].map(
              (itemListElement) => {
                const image = itemListElement['schema:image'];
                const name = itemListElement["schema:name"];
                const value = itemListElement["schema:value"];
                const score = itemListElement["schema:score"];
                const description = itemListElement["schema:description"];

                return {
                  image: 
                    typeof image === 'string' && image ||
                    Array.isArray(image) && image[0] && image[0]['@value'].toString(),
                  name:
                    typeof name == "string" && name ||
                    Array.isArray(name) && name[0] && name[0]['@value'].toString(),
                  value:
                    Array.isArray(value) && value[0] && value[0]['@value'],
                  score:
                    Array.isArray(score) && score[0] && score[0]['@value'],
                  description:
                    typeof description == 'string' && description ||
                    Array.isArray(description) && description[0] && description[0]['@value'].toString(),
                };
              }
            ),
        };
      }

      if (itemType === 'prize') {
        itemContent.options = {
          isMultipleChoice: itemContent.multipleChoice || false,
          hasScoreValue: itemContent.scoring || true,
          nextOptionImage: '',
          nextOptionName: '',
          options:
            responseOptions[0] &&
            responseOptions[0]['schema:itemListElement'] &&
            responseOptions[0]['schema:itemListElement'].map(
              (itemListElement) => {
                const name = itemListElement["schema:name"];
                const value = itemListElement["schema:value"];
                const price = itemListElement["schema:price"];
                const description = itemListElement["schema:description"];

                return {
                  name:
                    typeof name == "string" && name ||
                    Array.isArray(name) && name[0] && name[0]['@value'].toString(),
                  value:
                    Array.isArray(value) && value[0] && value[0]['@value'],
                  price:
                    Array.isArray(price) && price[0] && price[0]['@value'],
                  description:
                    typeof description == "string" && description ||
                    Array.isArray(description) && description[0] && description[0]['@value'].toString(),
                };
              }
            ),
        };
      }

      if (itemType === 'text') {
        itemContent.options = {
          requiredValue:
            responseOptions[0] &&
            responseOptions[0]['reprolib:terms/requiredValue'] &&
            responseOptions[0]['reprolib:terms/requiredValue'][0] &&
            responseOptions[0]['reprolib:terms/requiredValue'][0][
              '@value'
            ],
          // TODO: add 'maximum response length' value which is absent for now
        };
        if (item['schema:correctAnswer'] &&
          item['schema:correctAnswer'][0] &&
          item['schema:correctAnswer'][0]['@value']) {
          itemContent.correctAnswer = item['schema:correctAnswer'][0]['@value']
        }
      }
      if (itemType === 'slider') {
        itemContent.options = {
          hasScoreValue: itemContent.scoring || false,
          hasResponseAlert: itemContent.responseAlert || false,
          responseAlertMessage: itemContent.responseAlertMessage || '',
          maxValue:
            responseOptions[0] &&
            responseOptions[0]['schema:maxValue'] &&
            responseOptions[0]['schema:maxValue'][0] &&
            responseOptions[0]['schema:maxValue'][0]['@value'],
          minValue:
            responseOptions[0] &&
            responseOptions[0]['schema:minValue'] &&
            responseOptions[0]['schema:minValue'][0] &&
            responseOptions[0]['schema:minValue'][0]['@value'],
          maxValueImg:
            responseOptions[0] &&
            responseOptions[0]['schema:maxValueImg'] &&
            responseOptions[0]['schema:maxValueImg'][0] &&
            responseOptions[0]['schema:maxValueImg'][0]['@value'],
          minValueImg:
            responseOptions[0] &&
            responseOptions[0]['schema:minValueImg'] &&
            responseOptions[0]['schema:minValueImg'][0] &&
            responseOptions[0]['schema:minValueImg'][0]['@value'],
          numOptions:
            responseOptions[0] &&
            responseOptions[0]['schema:itemListElement'] &&
            responseOptions[0]['schema:itemListElement'].length,
          scores: itemContent.scoring && responseOptions[0] &&
            responseOptions[0]['schema:itemListElement'] &&
            responseOptions[0]['schema:itemListElement'].map(
              (itemListElement) => {
                const score = itemListElement["schema:score"];
                return Array.isArray(score) && score[0] && score[0]['@value']
              }
            )
        };
      }
      if (itemType === 'audioRecord' || itemType === 'audioImageRecord') {
        itemContent.options = {
          requiredValue:
            responseOptions[0] &&
            responseOptions[0]['reprolib:terms/requiredValue'] &&
            responseOptions[0]['reprolib:terms/requiredValue'][0] &&
            responseOptions[0]['reprolib:terms/requiredValue'][0][
              '@value'
            ],
          'schema:maxValue':
            responseOptions[0] &&
            responseOptions[0]['schema:maxValue'] &&
            responseOptions[0]['schema:maxValue'][0] &&
            responseOptions[0]['schema:maxValue'][0]['@value'],
          'schema:minValue':
            responseOptions[0] &&
            responseOptions[0]['schema:minValue'] &&
            responseOptions[0]['schema:minValue'][0] &&
            responseOptions[0]['schema:minValue'][0]['@value'],
        };
      }
    }

    // new block start
    const responseOptions2 = item['reprolib:terms/responseOptions'];
    if(responseOptions2 && responseOptions2.length > 0) {
      // delete "itemType === 'audioImageRecord' || itemType === 'drawing' || itemType === 'geolocation'" later !!!!!!! this should works for all items wich contains responseOptions, modification for specific values should be inside "responseOptionsModifier" function
      if(itemType === 'audioImageRecord' || itemType === 'drawing' || itemType === 'geolocation')
        itemContent.responseOptions = this.responseOptionsModifier(itemType, responseOptions2);
    }

    const inputOptions = item['reprolib:terms/inputs'];
    if(inputOptions && inputOptions.length > 0) {
      // delete "itemType === 'drawing'" later !!!!!!! this should works for all items wich contains inputOptions, modification for specific values should be inside "inputOptionsModifier" function
      if(itemType === 'drawing')
        itemContent.inputOptions = this.inputOptionsModifier(itemType, inputOptions);
    }
    // new block end

    if (itemType === 'audioStimulus') {
      let mediaObj = Object.entries(
        item['reprolib:terms/media'] && item['reprolib:terms/media'][0]
      );

      if (mediaObj) {
        let mediaUrl = mediaObj[0][0];
        let mediaData = mediaObj[0][1];

        itemContent.media = {
          [mediaUrl]: {
            'schema:contentUrl': [mediaUrl],
            'schema:name':
              mediaData[0] &&
              mediaData[0]['schema:name'] &&
              mediaData[0]['schema:name'][0] &&
              mediaData[0]['schema:name'][0]['@value'],
            'schema:transcript':
              mediaData[0] &&
              mediaData[0]['schema:transcript'] &&
              mediaData[0]['schema:transcript'][0] &&
              mediaData[0]['schema:transcript'][0]['@value'],
          },
        };
      }
    }

    itemContent.isValid = true;

    return itemContent;
  }

  // Modifiers for data from schema for using data inside app - Start
  // response options modifier
  responseOptionsModifier(itemType, options) {
    const responseOptions = options[0];
    const modifiedResponseOptions = {};

    const valueType = responseOptions['reprolib:terms/valueType'];
    if(valueType)
      modifiedResponseOptions['valueType'] = valueType[0]['@id'];

    const minValue = responseOptions['schema:minValue'];
    if(minValue)
      modifiedResponseOptions['schema:minValue'] = minValue[0]['@value'];

    const maxValue = responseOptions['schema:maxValue'];
    if(maxValue)
      modifiedResponseOptions['schema:maxValue'] = maxValue[0]['@value'];

    const image = responseOptions['schema:image'];
    if(image)
      modifiedResponseOptions['schema:image'] = image;

    const multipleChoice = responseOptions['reprolib:terms/multipleChoice'];
    if(multipleChoice)
      modifiedResponseOptions['multipleChoice'] = multipleChoice[0]['@value'];

    const requiredValue = responseOptions['reprolib:terms/requiredValue'];
    if(requiredValue)
      modifiedResponseOptions['requiredValue'] = requiredValue[0]['@value'];

    return modifiedResponseOptions;
  }

  // input options modifier
  inputOptionsModifier(itemType, options) {
    const modifiedInputOptions = [];

    options.forEach(option => {
      const modifiedOption = {};

      const type = option['@type'];
      if(type)
        modifiedOption['@type'] = 'schema:' + this.getTypeOfActionFromSchemaURL(type[0]);
      
      const name = option['schema:name'];
      if(name)
        modifiedOption['schema:name'] = name[0]['@value'];
      
      const value = option['schema:value'];
      if(value)
        modifiedOption['schema:value'] = value[0]['@value'];

      modifiedInputOptions.push(modifiedOption);
    });

    return modifiedInputOptions;
  }

  // helper functions for modifiers
  getTypeOfActionFromSchemaURL(url) {
    const index = url.lastIndexOf('/');
    if(index >= 0 && url.length - 1 > index) return url.slice(index + 1);
    else return '';
  }

  static checkValidation (item) {
    return item.name;
  }
}
