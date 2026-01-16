<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Milkdown, useEditor } from '@milkdown/vue';
import { Editor, defaultValueCtx, editorViewCtx, rootCtx, schemaCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { nord } from '@milkdown/theme-nord';
import '@milkdown/theme-nord/style.css';
import { useNoteStore } from '../stores/useNoteStore';

const props = defineProps<{
  modelValue: string;
  noteTitle: string;
  notePath: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const store = useNoteStore();
const fileInput = ref<HTMLInputElement | null>(null);

const { editor, get } = useEditor((root) => {
  return Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, props.modelValue ?? '');
      ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
        emit('update:modelValue', markdown);
      });
    })
    .use(nord)
    .use(commonmark)
    .use(listener);
});

onMounted(() => {
  console.info('[editor] mounted');
  get()?.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    view.focus();
  });
});

const openFilePicker = () => {
  fileInput.value?.click();
};

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  console.info('[editor] onFileChange', file.name);
  const src = await store.saveImage(file);
  target.value = '';
  if (!src) return;
  get()?.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const schema = ctx.get(schemaCtx);
    const node = schema.nodes.image.create({
      src,
      alt: file.name,
      title: file.name,
    });
    const tr = view.state.tr.replaceSelectionWith(node);
    view.dispatch(tr);
    view.focus();
  });
};
</script>

<template>
  <div class="editor-shell">
    <div class="editor-toolbar">
      <div class="title">{{ noteTitle }}</div>
      <div class="toolbar-actions">
        <button class="ghost" @click="openFilePicker">插入图片</button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden-input"
          @change="onFileChange"
        />
      </div>
    </div>
    <div class="editor-body">
      <Milkdown :editor="editor" />
    </div>
  </div>
</template>
