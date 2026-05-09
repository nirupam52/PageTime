import { mount } from 'svelte'
import App from './App.svelte'
import '../lib/global.css'

mount(App, { target: document.getElementById('app')! })
