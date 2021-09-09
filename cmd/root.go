package cmd

import (
  "github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
  Use: "octowise",
  Short: "Octowise CLI",
  Long: "Octowise is a tool for retrieving Kobo highlights",
}

func Execute() error {
  return rootCmd.Execute()
}
