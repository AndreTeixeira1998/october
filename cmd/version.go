package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

func init() {
	rootCmd.AddCommand(versionCmd)
}

var versionCmd = &cobra.Command{
	Use: "version",
	Short: "Print the version number for Octowise",
	Long: `Something to fill in later`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Octowise v0.0 -- HEAD")
	},
}