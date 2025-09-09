#!/usr/bin/env bash

# Convert Windows paths to Unix style if needed
convert_path() {
    echo "$1" | sed 's/\\/\//g'
}

# Check for ImageMagick
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick is not installed. Please install it first:"
    echo "Windows (with Chocolatey): choco install imagemagick"
    echo "Or download from: https://imagemagick.org/script/download.php#windows"
    exit 1
fi

# Find all files that begin with 'areas' and end with .js
shopt -s nullglob
area_files=(areas*.js)

if [ ${#area_files[@]} -eq 0 ]; then
    echo "No files matching areas*.js found in current directory."
    exit 0
fi

echo "Found ${#area_files[@]} areas file(s):"
for f in "${area_files[@]}"; do echo "  - $f"; done
echo

for file in "${area_files[@]}"; do
    echo "----"
    echo "Processing $file"

    # Prompt user for base folder containing 'new' and 'old' for this specific areas file
    while true; do
        read -e -p "Enter images base folder path for '$file' (should contain 'new' and 'old') (or type 'skip' to skip this file): " base_input
        if [ -z "$base_input" ]; then
            echo "Please provide a path or type 'skip'."
            continue
        fi
        if [ "$base_input" = "skip" ]; then
            echo "Skipping $file"
            break
        fi
        BASE_PATH=$(convert_path "$base_input")
        NEW_IMAGE_PATH="$BASE_PATH/new"
        OLD_IMAGE_PATH="$BASE_PATH/old"
        if [ -d "$NEW_IMAGE_PATH" ] && [ -d "$OLD_IMAGE_PATH" ]; then
            echo "Using NEW image folder: $NEW_IMAGE_PATH"
            echo "Using OLD image folder: $OLD_IMAGE_PATH"
            break
        else
            echo "Either '$NEW_IMAGE_PATH' or '$OLD_IMAGE_PATH' does not exist. Try again or type 'skip'."
        fi
    done

    if [ "$base_input" = "skip" ]; then
        continue
    fi

    # Backup original
    cp "$file" "${file}.backup"
    echo "Backup created: ${file}.backup"

    # Create temporary file for processing
    temp_file=$(mktemp)

    # Process file: insert/replace width/height in point and compute offset width/height 
    awk -v new_img="$NEW_IMAGE_PATH" -v old_img="$OLD_IMAGE_PATH" '
        BEGIN {
            in_area = 0
            in_point = 0
            in_offset = 0
            skip_point_wh = 0
            skip_offset_wh = 0
            current_ident = ""
        }

        # Start of an object (area)
        /^ *\{/ {
            in_area = 1
            print
            next
        }

        # Capture the ident when we find it
        /ident[[:space:]]*:/ && in_area {
            if (match($0, /"([^"]+)"/, arr)) {
                current_ident = arr[1]
            } else {
                current_ident = ""
            }
            print
            next
        }

        # When we find point: {, enter point block
        /point[[:space:]]*:[[:space:]]*\{/ && in_area {
            in_point = 1
            skip_point_wh = 0
            print
            next
        }

        # When we find offset: {, enter offset block
        /offset[[:space:]]*:[[:space:]]*\{/ && in_area {
            in_offset = 1
            skip_offset_wh = 0
            print
            next
        }

        # After y coordinate in point block, add width and height (from NEW image), and skip existing width/height
        in_point && /y[[:space:]]*:/ {
            # Ensure y line ends with a comma
            if ($0 !~ /,$/) { sub(/$/, ",") }
            print
            # Get new image dimensions
            new_w = 0; new_h = 0; old_w = 0; old_h = 0;
            if (current_ident != "") {
                cmd_new = "magick identify -format \"%wx%h\" \"" new_img "/" current_ident ".png\" 2>/dev/null"
                if ((cmd_new | getline dims_new) > 0) {
                    split(dims_new, dn, "x"); new_w = (dn[1] + 0); new_h = (dn[2] + 0);
                }
                close(cmd_new)

                cmd_old = "magick identify -format \"%wx%h\" \"" old_img "/" current_ident ".png\" 2>/dev/null"
                if ((cmd_old | getline dims_old) > 0) {
                    split(dims_old, do_, "x"); old_w = (do_[1] + 0); old_h = (do_[2] + 0);
                }
                close(cmd_old)
            }
            # Print width/height for point (use new image dims)
            #            printf "      width: %d,\n", new_w
            #            printf "      height: %d\n", new_h
            # Use OLD image dimensions for point
            printf "      width: %d,\n", old_w
            printf "      height: %d\n", old_h
            skip_point_wh = 1
            next
        }

        # After y coordinate in offset block, add offset width/height = new - old
        in_offset && /y[[:space:]]*:/ {
            if ($0 !~ /,$/) { sub(/$/, ",") }
            print
            # Compute differences
            diff_w = 0; diff_h = 0;
            if (current_ident != "") {
                cmd_new = "magick identify -format \"%wx%h\" \"" new_img "/" current_ident ".png\" 2>/dev/null"
                if ((cmd_new | getline dims_new) > 0) {
                    split(dims_new, dn2, "x"); new_w = (dn2[1] + 0); new_h = (dn2[2] + 0);
                } else { new_w=0; new_h=0 }
                close(cmd_new)

                cmd_old = "magick identify -format \"%wx%h\" \"" old_img "/" current_ident ".png\" 2>/dev/null"
                if ((cmd_old | getline dims_old2) > 0) {
                    split(dims_old2, do2, "x"); old_w = (do2[1] + 0); old_h = (do2[2] + 0);
                } else { old_w=0; old_h=0 }
                close(cmd_old)

                # Compute offset as (new - old)
                diff_w = new_w - old_w
                diff_h = new_h - old_h
            }
            printf "      width: %d,\n", diff_w
            printf "      height: %d\n", diff_h
            skip_offset_wh = 1
            next
        }

        # If skipping is active, drop any existing width/height lines inside point or offset
        in_point && skip_point_wh && /^[[:space:]]*width[[:space:]]*:/ { next }
        in_point && skip_point_wh && /^[[:space:]]*height[[:space:]]*:/ { next }
        in_offset && skip_offset_wh && /^[[:space:]]*width[[:space:]]*:/ { next }
        in_offset && skip_offset_wh && /^[[:space:]]*height[[:space:]]*:/ { next }

        # End of point block
        /^ *\}/ && in_point {
            in_point = 0
            skip_point_wh = 0
            print
            next
        }

        # End of offset block
        /^ *\}/ && in_offset {
            in_offset = 0
            skip_offset_wh = 0
            print
            next
        }

        # End of area object
        /^ *\},?$/ && in_area {
            in_area = 0
            in_point = 0
            in_offset = 0
            skip_point_wh = 0
            skip_offset_wh = 0
            print
            next
        }

        { print }
    ' "$file" > "$temp_file"

    mv "$temp_file" "$file"

    echo "Finished $file (backup at ${file}.backup)"
done

echo "All done."
