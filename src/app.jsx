import React, { Component } from 'react'

import logo from './logo.png'

export default class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <img className="mx-auto h-36 w-auto logo-animation" src={logo} alt="Octowise logo, which is a cartoon octopus reading a book." />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Octowise</h2>
            <p className="mt-2 text-center text-sm text-gray-600">Sync your Kobo highlights (unofficially) with Readwise</p>
          </div>
          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Select your mounted Kobo device
            </button>
          </div>
        </div>
      </div>
    )
  }
}
