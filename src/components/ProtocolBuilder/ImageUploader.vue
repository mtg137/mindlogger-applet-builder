<template>
  <div>

    <v-alert v-if="typeOfStructure === -1" type="error">
      <p>Please choice what type of uploader you need!!!</p>
      <p v-for="(item, index) in typesOfStructure" :key="item">
        {{ index + 1 }}.{{ item }}
      </p>
      <p>use :uploadFor="'type'" value</p>
    </v-alert>

    <v-expansion-panels v-if="typeOfStructure === 0">
      <v-expansion-panel>
        <v-expansion-panel-header disable-icon-rotate>
          {{ itemImg ? 'Change' : 'Add' }} Header Image
          <template v-slot:actions>
            <v-icon>mdi-cloud-upload</v-icon>
          </template>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <div class="upload-from-pc-wrapper">
            <input 
              class="file-input" 
              type="file" 
              accept="image/jpeg, image/png, image/bmp" 
              @change="onChangeFile"
            >
            <v-btn>Your computer</v-btn>
          </div>
          <v-btn class="mt-4" @click="isUrlOptionActive = true">From URL</v-btn>
          <v-btn v-if="itemImg" class="mt-4" color="error" @click="onClickToRemoveImage">Remove image</v-btn>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="upload-from-pc-wrapper" v-if="typeOfStructure === 1">
      <input 
        v-if="!itemImg"
        class="file-input" 
        type="file" 
        accept="image/jpeg, image/png, image/bmp" 
        @change="onChangeFile"
      >
      <v-icon v-if="!itemImg" style="font-size: 55px;">mdi-image-search</v-icon>
      <v-icon v-if="itemImg" style="font-size: 55px;"
        @click="onClickToRemoveImage">mdi-delete-outline</v-icon>
    </div>

    <v-text-field
      v-if="typeOfStructure === 2"
      v-model="newUrlValue"
      label="Option Image"
      @change="onChangeURL"
    />

    <v-dialog v-model="isUrlOptionActive" persistent width="800">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          <v-icon left>mdi-pencil</v-icon>
          Upload from URL
        </v-card-title>
        <v-card-text>
          <v-text-field label="URL" v-model="newUrlValue" />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-btn outlined color="primary" @click="isUrlOptionActive = false">
            Close
          </v-btn>
          <v-spacer />
          <v-btn color="primary" @click="onChangeURL(newUrlValue)">
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="isNotifyState" persistent width="400">
      <v-alert v-if="successMsg" type="success">{{successMsg}}</v-alert>
      <v-alert v-if="errorMsg" type="error">
        <p>{{ itemImg ? 'Image is not changed!!!' : 'Image is not added!!!' }}</p>
        <span>{{ errorMsg }}</span>
      </v-alert>
    </v-dialog>

  </div>
</template>

<script>
import ImageUploader from '../../models/ImageUploader';

export default {
  props: {
    uploadFor: {
      type: String,
      default: 'error'
    },
    itemImg: {
      type: String,
      default: ''
    }
  },
  data() {
    const imgUploader = new ImageUploader();

    const typesOfStructure = ['activity-item', 'item-radio-option-pc', 'item-radio-option-url'];
    const typeOfStructure = typesOfStructure.findIndex(structure => structure === this.uploadFor);
    
    let isUrlOptionActive = false;
    let newUrlValue = '';

    let isNotifyState = false;

    let successMsg = '';
    let errorMsg = '';

    return {
      imgUploader, typesOfStructure, typeOfStructure, isUrlOptionActive, 
      newUrlValue, isNotifyState, successMsg, errorMsg
    }
  },
  methods: {
    async onChangeFile(event) {
      const file = event.target.files[0];
      this.notify('error', await this.imgUploader.isImageValid(file));
      if(file && !this.errorMsg) {
        this.$emit('onAddImg', file);
        this.notify('success', 'Image is ' + (this.itemImg ? 'changed' : 'added'));
      } else {
        event.target.value = '';
      }
    },
    async onChangeURL(url) {
      this.notify('error', await this.imgUploader.isImageValid(url));
      if(!this.errorMsg) {
        this.$emit('onAddImg', url);
        this.isUrlOptionActive = false;
        this.newUrlValue = '';
        this.notify('success', 'Image is ' + (this.itemImg ? 'changed' : 'added'));
      } 
    },
    onClickToRemoveImage() {
      this.$emit('onRemoveImg');
      this.notify('success', 'Image is removed');
    },
    notify(state, text) {
      let delay = 4000;
      if(state === 'success') {
        this.successMsg = text;
        delay = 1000;
      } else if(state === 'error') {
        this.errorMsg = text;
      }
      this.isNotifyState = true;
      setTimeout(() => {
        this.isNotifyState = false;
        this.successMsg = '';
        this.errorMsg = '';
      }, delay);
    }
  },
}
</script>

<style lang="scss" scoped>
.v-expansion-panel-content .v-btn {
  width: 100%;
}
.upload-from-pc-wrapper {
  position: relative;

  .file-input, .file-input:after {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    border-radius: 4px;
    z-index: 1;
    opacity: 0;
  }

  .file-input {
    &:after {
      content: '';
      cursor: pointer;
    }

    &:hover + .v-btn:before {
      opacity: 0.08;
    }
  }
}
.v-alert {
  padding: 25px;
  margin-bottom: 0px;
}
</style>